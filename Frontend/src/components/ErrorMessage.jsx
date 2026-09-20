function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-message">
      <p>⚠️ Something went wrong: {message}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;