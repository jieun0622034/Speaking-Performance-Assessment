package kr.speakingassessment.migration;

import io.swagger.v3.oas.annotations.Operation;
import java.io.IOException;
import java.util.Map;
import kr.speakingassessment.common.ApiError;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class PdfTextController {
    @PostMapping("/api/files/extract-text")
    @Operation(summary = "명단·평가 기준 PDF 텍스트 추출", description = "최대 12MB·30쪽. 원본 파일은 서버에 보관하지 않습니다.")
    public ResponseEntity<?> extract(@RequestParam MultipartFile file) {
        if (file.isEmpty() || file.getSize() > 12L * 1024 * 1024) {
            return invalid("PDF는 12MB 이하로 올려주세요.");
        }
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            if (doc.isEncrypted() || doc.getNumberOfPages() > 30) {
                return invalid("암호가 없는 30쪽 이하의 PDF를 사용해주세요.");
            }
            String text = new PDFTextStripper().getText(doc);
            if (text.isBlank()) return invalid("스캔 PDF는 아직 읽을 수 없어요. 텍스트 PDF 또는 엑셀·CSV로 올려주세요.");
            if (text.length() > 60000) return invalid("텍스트가 너무 많아요. 필요한 페이지만 올려주세요.");
            return ResponseEntity.ok(Map.of("text", text, "pages", doc.getNumberOfPages()));
        } catch (IOException e) {
            return invalid("PDF를 읽지 못했어요. 텍스트를 선택할 수 있는 PDF인지 확인해주세요.");
        }
    }
    private ResponseEntity<?> invalid(String message) {
        return ResponseEntity.badRequest().body(ApiError.of("PDF_EXTRACTION_FAILED", message));
    }
}
