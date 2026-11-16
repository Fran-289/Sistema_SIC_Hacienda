package sv.gob.hacienda.sic;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import sv.gob.hacienda.sic.entity.User;
import sv.gob.hacienda.sic.security.InputSanitizer;
import sv.gob.hacienda.sic.security.LoginAttemptService;
import sv.gob.hacienda.sic.security.PasswordUtil;
import sv.gob.hacienda.sic.util.BusinessDayCalculator;

import java.time.LocalDate;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class SecurityUnitTest {

    @Test
    public void testUserPasswordNeverSerializedToJson() throws Exception {
        User user = new User();
        user.id = 1L;
        user.email = "admin@hacienda.gob.sv";
        user.name = "Admin";
        user.password = "$2a$10$secretHashValueShouldNeverAppear";
        user.role = "ADMIN";
        user.permissions = "[\"ingresos\"]";

        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(user);

        assertFalse(json.contains("password"), "El campo password no debe serializarse");
        assertFalse(json.contains("secretHashValueShouldNeverAppear"), "El hash BCrypt no debe filtrarse en JSON");
        assertTrue(json.contains("admin@hacienda.gob.sv"));
    }

    @Test
    public void testInputSanitizerRemovesNullBytesAndControlChars() {
        String dirty = "  Consulado\u0000\u0007\r\n   Washington  ";
        assertEquals("Consulado Washington", InputSanitizer.cleanSingleLine(dirty));
        assertNull(InputSanitizer.clean("   \u0000  "));
    }

    @Test
    public void testBruteForceLoginProtectionBlocksAfterFiveFailures() {
        LoginAttemptService service = new LoginAttemptService();
        String ip = "192.168.1.50";
        String email = "test@hacienda.gob.sv";

        for (int i = 0; i < 4; i++) {
            service.recordFailure(ip, email);
            assertFalse(service.isBlocked(ip, email));
        }

        service.recordFailure(ip, email);
        assertTrue(service.isBlocked(ip, email), "Debe bloquear al quinto intento fallido");

        service.recordSuccess(ip, email);
        assertFalse(service.isBlocked(ip, email), "Debe desbloquear el par IP+correo tras login exitoso");
    }

    @Test
    public void testPasswordUtilRejectsOversizedPasswords() {
        String hash = PasswordUtil.hash("AdminSic2026!");
        assertTrue(PasswordUtil.verify("AdminSic2026!", hash));
        assertFalse(PasswordUtil.verify("a".repeat(100), hash), "Contraseñas >72 chars deben rechazarse (protección BCrypt)");
    }

    @Test
    public void testBusinessDayCalculatorExcludesWeekendsAndElSalvadorHolidays() {
        // Viernes 13 nov 2026 al Lunes 16 nov 2026 -> 1 día hábil (sáb 14 y dom 15 no cuentan)
        assertEquals(1, BusinessDayCalculator.countBusinessDays(
                LocalDate.of(2026, 11, 13),
                LocalDate.of(2026, 11, 16),
                Set.of()
        ));

        // 15 de septiembre de 2026 (Martes, Independencia): Lunes 14 al Miércoles 16 -> solo Miércoles 16 cuenta (1 día)
        assertEquals(1, BusinessDayCalculator.countBusinessDays(
                LocalDate.of(2026, 9, 14),
                LocalDate.of(2026, 9, 16),
                Set.of()
        ));

        // Semana Santa 2026: Pascua es Domingo 5 abril 2026 -> Jueves Santo 2 abr, Viernes Santo 3 abr
        // Miércoles 1 abril al Lunes 6 abril -> solo Lunes 6 abril cuenta (1 día hábil)
        assertEquals(1, BusinessDayCalculator.countBusinessDays(
                LocalDate.of(2026, 4, 1),
                LocalDate.of(2026, 4, 6),
                Set.of()
        ));
    }
}
