package kr.speakingassessment.account;

import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkspaceService {
  private final JdbcTemplate jdbc;
  private final ObjectMapper json;

  public WorkspaceService(JdbcTemplate jdbc, ObjectMapper json) {
    this.jdbc = jdbc;
    this.json = json;
  }

  public Map<String, Object> get(String owner) {
    return jdbc.queryForObject(
        "SELECT revision,data FROM studio_workspaces WHERE owner_id=?",
        (r, i) -> {
          try {
            return Map.of(
                "revision", r.getLong("revision"), "data", json.readTree(r.getString("data")));
          } catch (Exception e) {
            throw new IllegalStateException("자료를 읽지 못했습니다.");
          }
        },
        owner);
  }

  public void audit(String owner, String event, Long revision) {
    jdbc.update(
        "INSERT INTO studio_audit VALUES(?,?,?,?,?)",
        UUID.randomUUID().toString(),
        owner,
        event,
        revision,
        Instant.now().toString());
  }

  private void check(boolean valid, String message) {
    if (!valid) throw new IllegalArgumentException(message);
  }

  private String identifier(JsonNode n, String key) {
    String value = n.path(key).asText();
    check(value.matches("[A-Za-z0-9_-]{1,80}"), "자료 식별자를 확인해주세요.");
    return value;
  }

  private Map<String, Double> criteria(JsonNode list) {
    check(list.isArray() && list.size() >= 1 && list.size() <= 8, "평가 항목은 1~8개여야 합니다.");
    Map<String, Double> result = new HashMap<>();
    for (JsonNode c : list) {
      String id = identifier(c, "id");
      check(!result.containsKey(id), "평가 항목이 중복됩니다.");
      AccountService.text(c, "name", 80, true);
      AccountService.text(c, "description", 2000, false);
      double max = c.path("max").asDouble(-1);
      check(
          c.path("max").isNumber() && Double.isFinite(max) && max > 0 && max <= 100,
          "배점을 1~100점 범위로 입력해주세요.");
      result.put(id, max);
    }
    return result;
  }

  private void validate(String owner, JsonNode data) {
    check(data.path("version").asInt() == 1, "지원하지 않는 자료 형식입니다.");
    JsonNode profile = data.path("profile");
    AccountService.text(profile, "name", 60, true);
    AccountService.text(profile, "school", 100, false);
    AccountService.text(profile, "subject", 30, true);
    JsonNode courses = data.path("courses"), takes = data.path("takes");
    check(courses.isArray() && courses.size() <= 200, "수업은 200개까지 저장할 수 있습니다.");
    check(takes.isArray() && takes.size() <= 10000, "녹음 자료 수를 확인해주세요.");
    Map<String, Set<String>> memberships = new HashMap<>();
    Set<String> allStudents = new HashSet<>();
    for (JsonNode c : courses) {
      String cid = identifier(c, "id");
      check(!memberships.containsKey(cid), "수업 식별자가 중복됩니다.");
      check(!c.path("sample").asBoolean(), "예시 수업은 운영 자료로 저장하지 않습니다.");
      AccountService.text(c, "name", 60, true);
      AccountService.text(c, "grade", 30, true);
      AccountService.text(c, "classroom", 30, true);
      AccountService.text(c, "task", 100, true);
      check(
          c.path("prompt").asText().length() <= 20000
              && c.path("rubric").asText().length() <= 60000,
          "평가 기준이 너무 깁니다.");
      criteria(c.path("criteria"));
      JsonNode students = c.path("students");
      check(students.isArray() && students.size() <= 1000, "수업당 학생은 1,000명까지입니다.");
      Set<Integer> numbers = new HashSet<>();
      Set<String> ids = new HashSet<>();
      for (JsonNode s : students) {
        String sid = identifier(s, "id");
        check(allStudents.add(sid), "학생 식별자가 중복됩니다.");
        ids.add(sid);
        AccountService.text(s, "name", 60, true);
        int number = s.path("number").asInt();
        check(
            s.path("number").isIntegralNumber()
                && number >= 1
                && number <= 999
                && numbers.add(number),
            "같은 학급의 번호가 중복되거나 범위를 벗어났습니다.");
      }
      memberships.put(cid, ids);
    }
    Set<String> ownedMedia =
        new HashSet<>(
            jdbc.queryForList("SELECT id FROM studio_media WHERE owner_id=?", String.class, owner));
    Set<String> takeIds = new HashSet<>();
    for (JsonNode t : takes) {
      String tid = identifier(t, "id");
      check(takeIds.add(tid), "녹음 식별자가 중복됩니다.");
      String cid = identifier(t, "courseId"), sid = identifier(t, "studentId");
      check(
          memberships.containsKey(cid) && memberships.get(cid).contains(sid), "녹음의 수업·학생을 확인해주세요.");
      check(!t.path("sample").asBoolean(), "예시 점수는 운영 자료로 저장하지 않습니다.");
      String media = identifier(t, "blobId");
      check(ownedMedia.contains(media), "현재 계정에 저장된 원본이 필요합니다.");
      AccountService.text(t, "studentName", 60, true);
      AccountService.text(t, "task", 100, true);
      Map<String, Double> rubric = criteria(t.path("criteria"));
      check(Set.of("audio", "video").contains(t.path("kind").asText()), "녹음 종류를 확인해주세요.");
      double duration = t.path("duration").asDouble(-1);
      check(Double.isFinite(duration) && duration >= 0 && duration <= 3600, "녹음 시간을 확인해주세요.");
      try {
        Instant.parse(t.path("createdAt").asText());
      } catch (Exception e) {
        throw new IllegalArgumentException("녹음 일시가 올바르지 않습니다.");
      }
      boolean confirmed = t.path("confirmed").asBoolean();
      if (t.has("scores")) {
        JsonNode scores = t.path("scores");
        check(scores.isObject() && scores.size() == rubric.size(), "평가 점수 항목을 확인해주세요.");
        for (var c : rubric.entrySet()) {
          JsonNode value = scores.path(c.getKey());
          check(
              value.isNumber()
                  && Double.isFinite(value.asDouble())
                  && value.asDouble() >= 0
                  && value.asDouble() <= c.getValue(),
              "점수가 배점 범위를 벗어났습니다.");
        }
      } else check(!confirmed, "확정하려면 모든 항목의 점수가 필요합니다.");
      String feedback = t.path("feedback").asText("");
      check(feedback.length() <= 6000 && (!confirmed || !feedback.isBlank()), "최종 피드백을 확인해주세요.");
    }
  }

  @Transactional
  public Map<String, Object> save(String owner, JsonNode payload) {
    JsonNode data = payload.path("data");
    long revision = payload.path("revision").asLong(-1);
    check(payload.path("revision").isIntegralNumber() && revision >= 0, "저장 버전을 확인해주세요.");
    check(data.toString().length() <= 5_000_000, "저장할 자료가 너무 큽니다.");
    validate(owner, data);
    int changed =
        jdbc.update(
            "UPDATE studio_workspaces SET data=?,revision=revision+1,updated_at=? WHERE owner_id=?"
                + " AND revision=?",
            data.toString(),
            Instant.now().toString(),
            owner,
            revision);
    if (changed != 1)
      throw new ApiProblem(
          409, "REVISION_CONFLICT", "다른 탭에서 변경한 내용이 있습니다. 입력한 내용을 보관한 뒤 새로고침해주세요.");
    audit(owner, "WORKSPACE_SAVED", revision + 1);
    return Map.of("revision", revision + 1, "data", data);
  }
}
