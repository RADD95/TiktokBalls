const form = document.querySelector('#auth-form');
const message = document.querySelector('#auth-message');
const usernameInput = form.elements.username;
const passwordInput = form.elements.password;

function enableLoginField(field) {
    field.readOnly = false;
}

usernameInput.addEventListener('focus', () => enableLoginField(usernameInput), { once: true });
passwordInput.addEventListener('focus', () => enableLoginField(passwordInput), { once: true });

window.addEventListener('pageshow', () => {
    usernameInput.value = '';
    passwordInput.value = '';
});

form.addEventListener('submit', async event => {
    event.preventDefault();
    message.textContent = '';

    const body = Object.fromEntries(new FormData(form).entries());
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación');
        window.location.href = '/test/';
    } catch (error) {
        message.textContent = error.message;
    }
});