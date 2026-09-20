import { useState } from "react";

function Contact() {
  const [message, setMessage] = useState("");

  return (
    <section className="section-card">
      <h2>Contact Me</h2>
      <input
        type="text"
        className="contact-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <p>You typed: {message}</p>
      <p>Character count: {message.length}</p>
    </section>
  );
}

export default Contact;