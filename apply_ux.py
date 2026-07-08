import sys
import re

css_path = "public/style.css"
with open(css_path, "r", encoding="utf-8", errors="ignore") as f:
    css = f.read()

ux_css = """
/* ===== MODERN NATIVE UX ENHANCEMENTS ===== */
/* Ripple Effect for Buttons */
.ui-btn-compact, .main-quick-btn, button, .opt-btn {
    position: relative;
    overflow: hidden;
    transform: translate3d(0, 0, 0); /* Force Hardware Acceleration */
}
.ui-btn-compact:after, .main-quick-btn:after, button:not(.close-btn):after, .opt-btn:after {
    content: "";
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;
    background-image: radial-gradient(circle, #fff 10%, transparent 10.01%);
    background-repeat: no-repeat;
    background-position: 50%;
    transform: scale(10, 10);
    opacity: 0;
    transition: transform .5s, opacity 1s;
}
button:not(.close-btn):active:after, .main-quick-btn:active:after {
    transform: scale(0, 0);
    opacity: .3;
    transition: 0s;
}

/* Glassmorphism for Modals (Only applied loosely on dark themes for depth) */
body.full-dark-theme .library-modal-content,
body.soft-dark-theme .library-modal-content,
body.full-dark-theme .auth-form,
body.soft-dark-theme .auth-form {
    background: rgba(22, 30, 43, 0.85) !important;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* Bottom Sheet Modal for Mobile */
@media (max-width: 768px) {
    .library-modal-content {
        border-radius: 20px 20px 0 0 !important;
        margin: auto 0 0 0 !important;
        max-height: 90vh !important;
        height: 100% !important;
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .library-modal {
        align-items: flex-end !important;
        padding: 0 !important;
    }
    
    @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }
}
"""

css = css + "\n" + ux_css

with open(css_path, "w", encoding="utf-8") as f:
    f.write(css)

print("Applied modern UX enhancements to style.css")
