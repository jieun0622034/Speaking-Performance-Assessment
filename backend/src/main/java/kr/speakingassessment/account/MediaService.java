package kr.speakingassessment.account;

import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaService {
  public record StoredMedia(Path path, String contentType, long size) {}

  private final JdbcTemplate jdbc;
  private final Path directory;
  private static final Set<String> TYPES =
      Set.of(
          "audio/webm",
          "audio/mp4",
          "audio/wav",
          "audio/mpeg",
          "audio/ogg",
          "video/webm",
          "video/mp4");

  public MediaService(JdbcTemplate jdbc, @Value("${studio.media-directory}") String path)
      throws IOException {
    this.jdbc = jdbc;
    directory = Path.of(path).toAbsolutePath().normalize();
    Files.createDirectories(directory);
  }

  private void validateKey(String key) {
    if (!key.matches("[A-Za-z0-9_-]{1,80}"))
      throw new IllegalArgumentException("원본 식별자가 올바르지 않습니다.");
  }

  @Transactional
  public Map<String, Object> store(String owner, String key, MultipartFile file) throws Exception {
    validateKey(key);
    String type =
        Optional.ofNullable(file.getContentType())
            .orElse("")
            .split(";")[0]
            .toLowerCase(Locale.ROOT);
    if (!TYPES.contains(type) || file.isEmpty() || file.getSize() > 200L * 1024 * 1024)
      throw new IllegalArgumentException("지원되는 음성·영상 파일을 200MB 이하로 올려주세요.");
    jdbc.queryForObject(
        "SELECT owner_id FROM studio_workspaces WHERE owner_id=? FOR UPDATE", String.class, owner);
    List<Map<String, Object>> prior =
        jdbc.queryForList(
            "SELECT sha256,byte_size FROM studio_media WHERE owner_id=? AND id=?", owner, key);
    long used =
        jdbc.queryForObject(
            "SELECT COALESCE(SUM(byte_size),0) FROM studio_media WHERE owner_id=?",
            Long.class,
            owner);
    if (prior.isEmpty() && used + file.getSize() > 1024L * 1024 * 1024)
      throw new ApiProblem(413, "STORAGE_LIMIT", "계정의 원본 저장 한도(1GB)에 도달했습니다.");
    Path folder = directory.resolve(owner);
    Files.createDirectories(folder);
    Path temp = Files.createTempFile(folder, "upload-", ".tmp");
    Path target = folder.resolve(key + ".media");
    boolean fresh = prior.isEmpty();
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCompletion(int status) {
            try {
              Files.deleteIfExists(temp);
              if (fresh && status != STATUS_COMMITTED) Files.deleteIfExists(target);
            } catch (IOException ignored) {
            }
          }
        });
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    try (InputStream input = new DigestInputStream(file.getInputStream(), digest)) {
      Files.copy(input, temp, StandardCopyOption.REPLACE_EXISTING);
    }
    String hash = HexFormat.of().formatHex(digest.digest());
    if (!prior.isEmpty()) {
      String old = String.valueOf(prior.get(0).get("SHA256"));
      if (!MessageDigest.isEqual(
          old.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
          hash.getBytes(java.nio.charset.StandardCharsets.US_ASCII)))
        throw new ApiProblem(409, "MEDIA_CONFLICT", "같은 식별자에 다른 원본이 있습니다. 새 녹음으로 저장해주세요.");
      return Map.of("id", key, "saved", true);
    }
    Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
    String relative = directory.relativize(target).toString();
    jdbc.update(
        "INSERT INTO studio_media VALUES(?,?,?,?,?,?,?)",
        key,
        owner,
        type,
        file.getSize(),
        hash,
        relative,
        Instant.now().toString());
    return Map.of("id", key, "saved", true);
  }

  public StoredMedia read(String owner, String key) {
    validateKey(key);
    return jdbc.queryForObject(
        "SELECT content_type,byte_size,storage_path FROM studio_media WHERE owner_id=? AND id=?",
        (r, i) -> {
          Path file = directory.resolve(r.getString("storage_path")).normalize();
          if (!file.startsWith(directory) || !Files.isRegularFile(file))
            throw new ApiProblem(404, "NOT_FOUND", "원본 파일을 찾지 못했습니다.");
          return new StoredMedia(file, r.getString("content_type"), r.getLong("byte_size"));
        },
        owner,
        key);
  }
}
