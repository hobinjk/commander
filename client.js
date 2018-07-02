const commandInput = document.getElementById('command');
const messages = document.getElementById('messages');

commandInput.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    const msg = document.createElement('div');
    msg.textContent = commandInput.value;
    msg.classList.add('message', 'me');
    messages.appendChild(msg);

    fetch('/commands', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({text: commandInput.value}),
    }).then((res) => {
      return res.json();
    }).then((res) => {
      const text = res.text;
      const response = document.createElement('div');
      response.textContent = text;
      response.classList.add('message', 'other');
      messages.appendChild(response);
    });
    commandInput.value = '';
  }
});
