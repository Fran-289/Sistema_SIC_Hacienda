package sv.gob.hacienda.sic.security;

import java.util.regex.Pattern;

public final class InputSanitizer {

    // Elimina caracteres de control peligrosos (null bytes, caracteres no imprimibles excepto salto de línea/tab)
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]");

    private InputSanitizer() {}

    public static String clean(String input) {
        if (input == null) {
            return null;
        }
        String sanitized = CONTROL_CHARS.matcher(input).replaceAll("").trim();
        return sanitized.isEmpty() ? null : sanitized;
    }

    public static String cleanSingleLine(String input) {
        if (input == null) {
            return null;
        }
        String sanitized = CONTROL_CHARS.matcher(input).replaceAll("")
                .replace('\r', ' ')
                .replace('\n', ' ')
                .replaceAll("\\s{2,}", " ")
                .trim();
        return sanitized.isEmpty() ? null : sanitized;
    }
}
