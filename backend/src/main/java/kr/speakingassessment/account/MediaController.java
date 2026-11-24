package kr.speakingassessment.account;

import java.util.Map;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/media")
public class MediaController {
  private final MediaService service;

  public MediaController(MediaService service) {
    this.service = service;
  }

  @PostMapping(value = "/{key}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Map<String, Object> save(
      Authentication auth, @PathVariable String key, @RequestParam MultipartFile file)
      throws Exception {
    return service.store(auth.getName(), key, file);
  }

  @GetMapping("/{key}")
  public ResponseEntity<Resource> get(Authentication auth, @PathVariable String key) {
    var file = service.read(auth.getName(), key);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .contentType(MediaType.parseMediaType(file.contentType()))
        .contentLength(file.size())
        .body(new FileSystemResource(file.path()));
  }
}
