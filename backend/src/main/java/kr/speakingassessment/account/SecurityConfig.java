package kr.speakingassessment.account;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import kr.speakingassessment.common.ApiError;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

@Configuration
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  SecurityContextRepository securityContexts() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  CsrfTokenRepository csrfRepository() {
    return new HttpSessionCsrfTokenRepository();
  }

  @Bean
  UserDetailsService controllerAuthenticationOnly() {
    return email -> {
      throw new UsernameNotFoundException("로그인이 필요합니다.");
    };
  }

  @Bean
  SecurityFilterChain security(
      HttpSecurity http,
      SecurityContextRepository contexts,
      CsrfTokenRepository csrf,
      ObjectMapper json)
      throws Exception {
    return http.authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/api/auth/status",
                        "/api/auth/signup",
                        "/api/auth/login",
                        "/api/health",
                        "/actuator/health")
                    .permitAll()
                    .requestMatchers("/api/**")
                    .authenticated()
                    .anyRequest()
                    .permitAll())
        .addFilterAfter(
            new org.springframework.web.filter.OncePerRequestFilter() {
              @Override
              protected void doFilterInternal(
                  jakarta.servlet.http.HttpServletRequest req,
                  jakarta.servlet.http.HttpServletResponse res,
                  jakarta.servlet.FilterChain chain)
                  throws jakarta.servlet.ServletException, java.io.IOException {
                String owner = req.getHeader("X-Workspace-Owner");
                var auth =
                    org.springframework.security.core.context.SecurityContextHolder.getContext()
                        .getAuthentication();
                if (req.getRequestURI().startsWith("/api/")
                    && !req.getRequestURI().startsWith("/api/auth/")
                    && owner != null
                    && !unauthenticated()
                    && !owner.equals(auth.getName())) {
                  error(
                      res, 409, "ACCOUNT_CHANGED", "다른 탭에서 계정이 변경됐습니다. 원래 계정으로 다시 로그인해주세요.", json);
                  return;
                }
                chain.doFilter(req, res);
              }
            },
            org.springframework.security.web.authentication.AnonymousAuthenticationFilter.class)
        .csrf(c -> c.csrfTokenRepository(csrf))
        .securityContext(c -> c.securityContextRepository(contexts))
        .sessionManagement(s -> s.sessionFixation(f -> f.changeSessionId()))
        .requestCache(c -> c.disable())
        .formLogin(c -> c.disable())
        .httpBasic(c -> c.disable())
        .logout(c -> c.disable())
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (q, r, x) ->
                            error(r, 401, "AUTH_REQUIRED", "로그인이 만료되었습니다. 다시 로그인해주세요.", json))
                    .accessDeniedHandler(
                        (q, r, x) ->
                            error(
                                r,
                                unauthenticated() ? 401 : 403,
                                unauthenticated() ? "AUTH_REQUIRED" : "FORBIDDEN",
                                unauthenticated()
                                    ? "다시 로그인해주세요."
                                    : "보안 토큰 또는 접근 권한을 확인해주세요. 새로고침 후 다시 시도해주세요.",
                                json)))
        .headers(
            h ->
                h.frameOptions(f -> f.deny())
                    .contentSecurityPolicy(
                        c ->
                            c.policyDirectives(
                                "frame-ancestors 'none'; base-uri 'self'; object-src 'none'")))
        .build();
  }

  private static boolean unauthenticated() {
    var auth =
        org.springframework.security.core.context.SecurityContextHolder.getContext()
            .getAuthentication();
    return auth == null
        || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken;
  }

  static void error(
      HttpServletResponse response, int status, String code, String text, ObjectMapper json)
      throws java.io.IOException {
    response.setStatus(status);
    response.setContentType("application/json;charset=UTF-8");
    json.writeValue(response.getWriter(), ApiError.of(code, text));
  }
}
