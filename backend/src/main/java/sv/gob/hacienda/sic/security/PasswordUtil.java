package sv.gob.hacienda.sic.security;

import org.mindrot.jbcrypt.BCrypt;

public final class PasswordUtil {

    // Hash señuelo para mitigar ataques de temporización (enumeración de usuarios)
    private static final String DUMMY_HASH = BCrypt.hashpw("SicDummyTimingProtection2026!", BCrypt.gensalt(10));

    private PasswordUtil() {}

    public static String hash(String plainPassword) {
        return BCrypt.hashpw(plainPassword, BCrypt.gensalt(10));
    }

    public static boolean verify(String plainPassword, String hashedPassword) {
        if (plainPassword == null || hashedPassword == null || plainPassword.length() > 72) {
            return false;
        }
        try {
            return BCrypt.checkpw(plainPassword, hashedPassword);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public static void verifyDummy(String plainPassword) {
        String candidate = (plainPassword != null && plainPassword.length() <= 72) ? plainPassword : "dummy";
        BCrypt.checkpw(candidate, DUMMY_HASH);
    }
}
