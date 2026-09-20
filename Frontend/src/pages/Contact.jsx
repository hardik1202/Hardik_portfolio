import { useState } from "react";

function Contact() {
  const [message, setMessage] = useState("");

  return (
    <section className="page-section contact-page">
      <div className="contact-copy">
        <p className="eyebrow">Open channel</p>
        <h2>Have an idea?<br /><em>Let&apos;s talk.</em></h2>
        <p>Even a short note is a good place to start. Tell me what you&apos;re making, learning, or thinking about.</p>
        <div className="contact-meta"><span>01</span><span>Usually replies with curiosity.</span></div>
      </div>
      <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="contact-message">Your message</label>
        <textarea
          id="contact-message"
          className="contact-input contact-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="I have an idea about..."
          rows="6"
        />
        <div className="form-footer"><span>{message.length} characters</span><button className="primary-action" type="submit">Send a note <span aria-hidden="true">↗</span></button></div>
      </form>
    </section>
  );
}

export default Contact;