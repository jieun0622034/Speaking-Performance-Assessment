package kr.speakingassessment.account;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.*;
import java.util.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AccountService accounts;
  private final SecurityContextRepository contexts;
  private final CsrfTokenRepository csrf;

  public AuthController(
      AccountService accounts, SecurityContextRepository contexts, CsrfTokenRepository csrf) {
    this.accounts = accounts;
    this.contexts = contexts;
    this.csrf = csrf;
  }

  @GetMapping("/status")
  public Map<String, Object> status(
      Authentication auth, HttpServletRequest req, HttpServletResponse res) {
    res.setHeader("Cache-Control", "no-store");
    boolean authenticated = auth != null && auth.isAuthenticated();
    CsrfToken token = (CsrfToken) req.getAttribute(CsrfToken.class.getName());
    return Map.of(
        "authenticated",
        authenticated,
        "csrfToken",
        token.getToken(),
        "user",
        authenticated ? accounts.user(auth.getName()) : Map.of());
  }

  private Map<String, Object> session(String id, HttpServletRequest req, HttpServletResponse res) {
    req.getSession();
    req.changeSessionId();
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(
        new UsernamePasswordAuthenticationToken(
            id, null, List.of(new SimpleGrantedAuthority("ROLE_TEACHER"))));
    SecurityContextHolder.setContext(context);
    contexts.saveContext(context, req, res);
    csrf.saveToken(null, req, res);
    return Map.of("user", accounts.user(id));
  }

  @PostMapping("/signup")
  public Map<String, Object> signup(
      @RequestBody JsonNode p, HttpServletRequest req, HttpServletResponse res) {
    return session(accounts.signup(p, req.getRemoteAddr()), req, res);
  }

  @PostMapping("/login")
  public Map<String, Object> login(
      @RequestBody JsonNode p, HttpServletRequest req, HttpServletResponse res) {
    return session(accounts.login(p, req.getRemoteAddr()), req, res);
  }

  @PostMapping("/logout")
  public Map<String, Boolean> logout(
      Authentication auth, HttpServletRequest req, HttpServletResponse res) {
    new SecurityContextLogoutHandler().logout(req, res, auth);
    Cookie cookie = new Cookie("JSESSIONID", "");
    cookie.setHttpOnly(true);
    cookie.setPath("/");
    cookie.setMaxAge(0);
    res.addCookie(cookie);
    return Map.of("ok", true);
  }
}
