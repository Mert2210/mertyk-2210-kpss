Plan:
1. Update `public/index.html` to add `id="login-btn"` to the login button. This is needed so we can target it to change text and disable it.
2. Update `public/app.js` to add an event listener for `keyup` on both `#login-email` and `#login-pass` inputs. When `Enter` (key code 13 or `event.key === 'Enter'`) is pressed, it should trigger `handleLogin()`. We can add this inside `DOMContentLoaded`.
3. Update `handleLogin()` in `public/app.js`:
   - Find the login button using its ID (`#login-btn`).
   - Store its original text.
   - Disable the button and change text to "Yükleniyor...".
   - Put the Firebase sign in inside a `try...catch...finally` block.
   - In `finally`, restore the original text and enable the button.
4. Execute `pre_commit_instructions` tool to do checks.
5. Submit.
