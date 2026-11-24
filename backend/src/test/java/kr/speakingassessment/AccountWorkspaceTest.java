package kr.speakingassessment;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.*;
import org.springframework.test.web.servlet.*;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:accounts;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
      "studio.media-directory=${java.io.tmpdir}/speaking-account-tests"
    })
@AutoConfigureMockMvc
class AccountWorkspaceTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;

  record Client(MockHttpSession session, String token, String email) {}

  Client signup() throws Exception {
    String email = "test-" + UUID.randomUUID() + "@example.test";
    var status = mvc.perform(get("/api/auth/status")).andExpect(status().isOk()).andReturn();
    MockHttpSession session = (MockHttpSession) status.getRequest().getSession();
    String token =
        json.readTree(status.getResponse().getContentAsString()).path("csrfToken").asText();
    mvc.perform(
            post("/api/auth/signup")
                .session(session)
                .header("X-CSRF-TOKEN", token)
                .contentType("application/json")
                .content(
                    json.createObjectNode()
                        .put("email", email)
                        .put("password", "Test-local-2026!")
                        .put("name", "테스트 교사")
                        .put("school", "테스트 학교")
                        .toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.email").value(email))
        .andExpect(jsonPath("$.user.password").doesNotExist());
    var fresh =
        mvc.perform(get("/api/auth/status").session(session))
            .andExpect(jsonPath("$.authenticated").value(true))
            .andReturn();
    return new Client(
        session,
        json.readTree(fresh.getResponse().getContentAsString()).path("csrfToken").asText(),
        email);
  }

  JsonNode workspace(Client c) throws Exception {
    return json.readTree(
        mvc.perform(get("/api/workspace").session(c.session))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  ObjectNode populated(Client c) throws Exception {
    ObjectNode body = (ObjectNode) workspace(c);
    ArrayNode courses = (ArrayNode) body.path("data").path("courses");
    ObjectNode course =
        courses
            .addObject()
            .put("id", "course1")
            .put("name", "영어 발표")
            .put("grade", "2학년")
            .put("classroom", "1반")
            .put("task", "나의 일상")
            .put("prompt", "소개해보세요")
            .put("rubric", "")
            .put("color", "mint");
    course
        .putArray("criteria")
        .addObject()
        .put("id", "content")
        .put("name", "내용")
        .put("max", 100)
        .put("description", "내용의 충실성");
    ArrayNode students = course.putArray("students");
    for (int i = 1; i <= 30; i++)
      students.addObject().put("id", "student" + i).put("number", i).put("name", "학생" + i);
    return body;
  }

  @Test
  void rejectsOldTabsAfterAnotherAccountSignsIn() throws Exception {
    Client a = signup(), b = signup();
    String aId = workspaceOwner(a);
    mvc.perform(get("/api/workspace").session(b.session).header("X-Workspace-Owner", aId))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("ACCOUNT_CHANGED"));
    mvc.perform(
            post("/api/workspace")
                .session(b.session)
                .header("X-CSRF-TOKEN", b.token)
                .header("X-Workspace-Owner", aId)
                .contentType("application/json")
                .content(populated(a).toString()))
        .andExpect(status().isConflict());
    assertEquals(0, workspace(b).path("data").path("courses").size());
  }

  String workspaceOwner(Client c) throws Exception {
    return json.readTree(
            mvc.perform(get("/api/auth/status").session(c.session))
                .andReturn()
                .getResponse()
                .getContentAsString())
        .path("user")
        .path("id")
        .asText();
  }

  @Test
  void requiresLoginAndCsrfAndHasNoExampleData() throws Exception {
    mvc.perform(get("/api/workspace")).andExpect(status().isUnauthorized());
    Client c = signup();
    assertEquals(0, workspace(c).path("data").path("courses").size());
    mvc.perform(
            post("/api/workspace")
                .session(c.session)
                .contentType("application/json")
                .content(populated(c).toString()))
        .andExpect(status().isForbidden());
  }

  @Test
  void savesBulkRosterAndIsolatesAccountsAndRejectsStaleWrites() throws Exception {
    Client a = signup(), b = signup();
    ObjectNode payload = populated(a);
    mvc.perform(
            post("/api/workspace")
                .session(a.session)
                .header("X-CSRF-TOKEN", a.token)
                .contentType("application/json")
                .content(payload.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revision").value(1));
    assertEquals(30, workspace(a).path("data").path("courses").get(0).path("students").size());
    assertEquals(0, workspace(b).path("data").path("courses").size());
    mvc.perform(
            post("/api/workspace")
                .session(a.session)
                .header("X-CSRF-TOKEN", a.token)
                .contentType("application/json")
                .content(payload.toString()))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("REVISION_CONFLICT"));
  }

  @Test
  void rejectsDuplicatesWithoutPartialSave() throws Exception {
    Client c = signup();
    ObjectNode payload = populated(c);
    ((ObjectNode) payload.path("data").path("courses").get(0).path("students").get(1))
        .put("number", 1);
    mvc.perform(
            post("/api/workspace")
                .session(c.session)
                .header("X-CSRF-TOKEN", c.token)
                .contentType("application/json")
                .content(payload.toString()))
        .andExpect(status().isBadRequest());
    assertEquals(0, workspace(c).path("revision").asInt());
    assertEquals(0, workspace(c).path("data").path("courses").size());
  }

  @Test
  void storesOriginalMediaOnceAndOnlyServesOwnerIncludingByteRanges() throws Exception {
    Client a = signup(), b = signup();
    byte[] bytes = "RIFF-actual-test-original-bytes".getBytes();
    MockMultipartFile file = new MockMultipartFile("file", "recording.wav", "audio/wav", bytes);
    for (int i = 0; i < 2; i++)
      mvc.perform(
              multipart("/api/media/recording1")
                  .file(file)
                  .session(a.session)
                  .header("X-CSRF-TOKEN", a.token))
          .andExpect(status().isOk());
    mvc.perform(get("/api/media/recording1").session(a.session))
        .andExpect(status().isOk())
        .andExpect(content().bytes(bytes))
        .andExpect(header().string("Cache-Control", "no-store"));
    mvc.perform(get("/api/media/recording1").session(a.session).header("Range", "bytes=0-3"))
        .andExpect(status().isPartialContent())
        .andExpect(content().bytes("RIFF".getBytes()));
    mvc.perform(get("/api/media/recording1").session(b.session)).andExpect(status().isNotFound());
    mvc.perform(
            multipart("/api/media/recording1")
                .file(
                    new MockMultipartFile("file", "other.wav", "audio/wav", "DIFFERENT".getBytes()))
                .session(a.session)
                .header("X-CSRF-TOKEN", a.token))
        .andExpect(status().isConflict());
  }

  @Test
  void linksUploadedOriginalAndRequiresCompleteTeacherConfirmation() throws Exception {
    Client c = signup();
    ObjectNode payload = populated(c);
    ObjectNode take =
        ((ArrayNode) payload.path("data").path("takes"))
            .addObject()
            .put("id", "take1")
            .put("courseId", "course1")
            .put("studentId", "student1")
            .put("studentName", "학생1")
            .put("studentNumber", 1)
            .put("task", "나의 일상")
            .put("kind", "audio")
            .put("duration", 12)
            .put("createdAt", java.time.Instant.now().toString())
            .put("blobId", "original1");
    take.set("criteria", payload.path("data").path("courses").get(0).path("criteria").deepCopy());
    mvc.perform(
            post("/api/workspace")
                .session(c.session)
                .header("X-CSRF-TOKEN", c.token)
                .contentType("application/json")
                .content(payload.toString()))
        .andExpect(status().isBadRequest());
    mvc.perform(
            multipart("/api/media/original1")
                .file(
                    new MockMultipartFile(
                        "file", "recording.wav", "audio/wav", "RIFF-original".getBytes()))
                .session(c.session)
                .header("X-CSRF-TOKEN", c.token))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/workspace")
                .session(c.session)
                .header("X-CSRF-TOKEN", c.token)
                .contentType("application/json")
                .content(payload.toString()))
        .andExpect(status().isOk());
    payload = (ObjectNode) workspace(c);
    take = (ObjectNode) payload.path("data").path("takes").get(0);
    take.put("confirmed", true);
    take.putObject("scores").put("content", 85);
    mvc.perform(
            post("/api/workspace")
                .session(c.session)
                .header("X-CSRF-TOKEN", c.token)
                .contentType("application/json")
                .content(payload.toString()))
        .andExpect(status().isBadRequest());
    take.put("feedback", "주장을 구체적으로 설명했습니다.");
    mvc.perform(
            post("/api/workspace")
                .session(c.session)
                .header("X-CSRF-TOKEN", c.token)
                .contentType("application/json")
                .content(payload.toString()))
        .andExpect(status().isOk());
    assertTrue(workspace(c).path("data").path("takes").get(0).path("confirmed").asBoolean());
  }

  @Test
  void logsOutAndReauthenticatesWithARealSession() throws Exception {
    Client c = signup();
    mvc.perform(post("/api/auth/logout").session(c.session).header("X-CSRF-TOKEN", c.token))
        .andExpect(status().isOk());
    var fresh = mvc.perform(get("/api/auth/status")).andReturn();
    MockHttpSession s = (MockHttpSession) fresh.getRequest().getSession();
    String token =
        json.readTree(fresh.getResponse().getContentAsString()).path("csrfToken").asText();
    mvc.perform(
            post("/api/auth/login")
                .session(s)
                .header("X-CSRF-TOKEN", token)
                .contentType("application/json")
                .content(
                    json.createObjectNode()
                        .put("email", c.email)
                        .put("password", "Wrong-password")
                        .toString()))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/auth/login")
                .session(s)
                .header("X-CSRF-TOKEN", token)
                .contentType("application/json")
                .content(
                    json.createObjectNode()
                        .put("email", c.email)
                        .put("password", "Test-local-2026!")
                        .toString()))
        .andExpect(status().isOk());
    mvc.perform(get("/api/workspace").session(s)).andExpect(status().isOk());
  }
}
