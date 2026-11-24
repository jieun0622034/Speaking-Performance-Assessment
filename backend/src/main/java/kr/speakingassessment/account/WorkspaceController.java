package kr.speakingassessment.account;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workspace")
public class WorkspaceController {
  private final WorkspaceService service;

  public WorkspaceController(WorkspaceService service) {
    this.service = service;
  }

  @GetMapping
  public Map<String, Object> get(Authentication auth) {
    return service.get(auth.getName());
  }

  @PostMapping
  public Map<String, Object> save(Authentication auth, @RequestBody JsonNode body) {
    return service.save(auth.getName(), body);
  }
}
