package kr.speakingassessment;

import java.io.ByteArrayOutputStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class PdfExtractionTest {
    @Autowired MockMvc mvc;
    byte[] fixture(int pages, boolean text) throws Exception {
        try (var doc = new PDDocument(); var out = new ByteArrayOutputStream()) {
            for(int i=0;i<pages;i++) doc.addPage(new PDPage());
            if(text) try(var content = new PDPageContentStream(doc,doc.getPage(0))) {
                content.beginText();content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA),12);
                content.newLineAtOffset(50,700);content.showText("number name");content.endText();
            }
            doc.save(out);return out.toByteArray();
        }
    }
    @Test void extractsActualText() throws Exception {
        mvc.perform(multipart("/api/files/extract-text").file(new MockMultipartFile("file","rubric.pdf","application/pdf",fixture(1,true))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.text").value(org.hamcrest.Matchers.containsString("number name")))
            .andExpect(jsonPath("$.pages").value(1));
    }
    @Test void scannedOrEmptyPdfDoesNotPretendToHaveRecognizedText() throws Exception {
        mvc.perform(multipart("/api/files/extract-text").file(new MockMultipartFile("file","scan.pdf","application/pdf",fixture(1,false))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PDF_EXTRACTION_FAILED"));
    }
    @Test void rejectsMalformedAndOversizedPageCount() throws Exception {
        for(byte[] bytes:new byte[][]{new byte[]{1,2,3},fixture(31,true)}) {
            mvc.perform(multipart("/api/files/extract-text").file(new MockMultipartFile("file","invalid.pdf","application/pdf",bytes)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").isString());
        }
    }
}
