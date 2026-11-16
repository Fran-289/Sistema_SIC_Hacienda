package sv.gob.hacienda.sic.security;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.ext.Provider;

@Provider
public class SecurityHeadersFilter implements ContainerResponseFilter {

    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) {
        MultivaluedMap<String, Object> headers = responseContext.getHeaders();
        headers.putSingle("X-Content-Type-Options", "nosniff");
        headers.putSingle("X-Frame-Options", "DENY");
        headers.putSingle("X-XSS-Protection", "0");
        headers.putSingle("Referrer-Policy", "strict-origin-when-cross-origin");
        headers.putSingle("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
        headers.putSingle("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
        headers.putSingle("Cache-Control", "no-store, no-cache, must-revalidate");
        headers.putSingle("Pragma", "no-cache");
    }
}
