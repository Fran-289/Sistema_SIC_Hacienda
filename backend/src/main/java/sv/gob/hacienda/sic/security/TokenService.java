package sv.gob.hacienda.sic.security;

import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import sv.gob.hacienda.sic.entity.User;

import java.util.List;

@ApplicationScoped
public class TokenService {

    private static final String ISSUER = "https://sic.hacienda.gob.sv";
    private static final long EXPIRY_SECONDS = 28800; // 8 horas laborales

    public String generateToken(User user) {
        return Jwt.subject(user.email)
                .upn(user.email)
                .claim("userId", user.id)
                .claim("name", user.name)
                .claim("groups", List.of(user.role))
                .issuer(ISSUER)
                .expiresIn(EXPIRY_SECONDS)
                .sign();
    }
}
