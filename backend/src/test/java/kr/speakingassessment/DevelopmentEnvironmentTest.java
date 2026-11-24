package kr.speakingassessment;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.security.test.context.support.WithMockUser;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:environment;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","studio.media-directory=${java.io.tmpdir}/speaking-environment-tests"})
@AutoConfigureMockMvc
@WithMockUser
class DevelopmentEnvironmentTest {
    @Autowired MockMvc mvc;
    @Autowired Flyway flyway;

    @Test void apiAndDatabaseAreReady() throws Exception {
        mvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.database").value("UP"));
        assertEquals("2", flyway.info().current().getVersion().toString());
    }

    @Test void openApiDescribesTheImplementedEndpoint() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("말하기 수행평가 API"))
                .andExpect(jsonPath("$.paths['/api/health'].get").exists());
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
    }

    @Test void unknownApiHasConsistentNotFoundResponse() throws Exception {
        mvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test void unmigratedAiNeverReturnsFakeGrades() throws Exception {
        for (String path : new String[]{"/api/rubric/generate", "/api/grade/speaking",
                "/api/grade/writing", "/api/grade/both", "/api/record/generate"}) {
            mvc.perform(post(path).with(csrf()).contentType("application/json").content("{}"))
                    .andExpect(status().isNotImplemented())
                    .andExpect(jsonPath("$.code").value("AI_MIGRATION_PENDING"))
                    .andExpect(jsonPath("$.error").isString())
                    .andExpect(jsonPath("$.criteria").doesNotExist());
        }
    }
}
