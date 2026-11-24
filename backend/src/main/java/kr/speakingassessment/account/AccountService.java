package kr.speakingassessment.account;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {
  private final JdbcTemplate jdbc;
  private final PasswordEncoder passwords;
  private final ObjectMapper json;
  private final String dummy;
  private final Map<String, List<Long>> attempts = new HashMap<>();

  public AccountService(JdbcTemplate jdbc, PasswordEncoder passwords, ObjectMapper json) {
    this.jdbc = jdbc;
    this.passwords = passwords;
    this.json = json;
    this.dummy = passwords.encode(UUID.randomUUID().toString());
  }

  private void limit(String address, String email) {
    synchronized (attempts) {
      long now = System.currentTimeMillis();
      attempts.entrySet().removeIf(e -> e.getValue().stream().allMatch(t -> t < now - 300000));
      if (attempts.size() > 10000)
        throw new ApiProblem(429, "RATE_LIMITED", "요청이 많습니다. 잠시 후 다시 시도해주세요.");
      for (String key : List.of("address:" + address, "account:" + email)) {
        List<Long> list = attempts.computeIfAbsent(key, k -> new ArrayList<>());
        list.removeIf(t -> t < now - 300000);
        if (list.size() >= (key.startsWith("address:") ? 40 : 10))
          throw new ApiProblem(429, "RATE_LIMITED", "로그인 요청이 많습니다. 5분 후 다시 시도해주세요.");
        list.add(now);
      }
    }
  }

  private String email(JsonNode p) {
    String value = p.path("email").asText("").trim().toLowerCase(Locale.ROOT);
    if (value.length() > 254 || !value.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
      throw new IllegalArgumentException("올바른 이메일을 입력해주세요.");
    return value;
  }

  private String password(JsonNode p) {
    String value = p.path("password").asText("");
    if (value.length() < 10 || value.getBytes(StandardCharsets.UTF_8).length > 72)
      throw new IllegalArgumentException("비밀번호는 10자 이상, UTF-8 72바이트 이하로 입력해주세요.");
    return value;
  }

  @Transactional
  public String signup(JsonNode p, String address) {
    String email = email(p), password = password(p);
    limit(address, email);
    String name = text(p, "name", 60, true), school = text(p, "school", 100, false);
    if (jdbc.queryForObject(
            "SELECT COUNT(*) FROM studio_teachers WHERE email=?", Integer.class, email)
        > 0) throw new ApiProblem(409, "EMAIL_UNAVAILABLE", "등록할 수 없는 이메일입니다. 기존 계정으로 로그인해주세요.");
    String id = UUID.randomUUID().toString();
    ObjectNode data = json.createObjectNode().put("version", 1);
    data.set(
        "profile",
        json.createObjectNode().put("name", name).put("school", school).put("subject", "영어"));
    data.putArray("courses");
    data.putArray("takes");
    jdbc.update(
        "INSERT INTO studio_teachers VALUES(?,?,?,?)",
        id,
        email,
        passwords.encode(password),
        Instant.now().toString());
    jdbc.update(
        "INSERT INTO studio_workspaces VALUES(?,0,?,?)",
        id,
        data.toString(),
        Instant.now().toString());
    return id;
  }

  public String login(JsonNode p, String address) {
    String email = email(p), password = password(p);
    limit(address, email);
    List<Map<String, String>> rows =
        jdbc.query(
            "SELECT id,password_hash FROM studio_teachers WHERE email=?",
            (r, i) -> Map.of("id", r.getString("id"), "hash", r.getString("password_hash")),
            email);
    String hash = rows.isEmpty() ? dummy : rows.get(0).get("hash");
    if (!passwords.matches(password, hash) || rows.isEmpty())
      throw new ApiProblem(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 일치하지 않습니다.");
    synchronized (attempts) {
      attempts.remove("account:" + email);
    }
    return rows.get(0).get("id");
  }

  public Map<String, String> user(String owner) {
    return jdbc.queryForObject(
        "SELECT t.id,t.email,w.data FROM studio_teachers t JOIN studio_workspaces w ON"
            + " t.id=w.owner_id WHERE t.id=?",
        (r, i) -> {
          try {
            return Map.of(
                "id",
                r.getString("id"),
                "email",
                r.getString("email"),
                "name",
                json.readTree(r.getString("data")).path("profile").path("name").asText());
          } catch (Exception e) {
            throw new IllegalStateException("프로필을 읽지 못했습니다.");
          }
        },
        owner);
  }

  static String text(JsonNode p, String key, int max, boolean required) {
    String value = p.path(key).asText("").trim();
    if ((required && value.isBlank())
        || value.length() > max
        || value.chars().anyMatch(c -> c < 32))
      throw new IllegalArgumentException(key + " 입력값을 확인해주세요.");
    return value;
  }
}
