interface FormFeedbackProps {
  error?: string | null;
  success?: string | null;
  className?: string;
}

export default function FormFeedback({ error, success, className = "" }: FormFeedbackProps) {
  if (!error && !success) return null;

  return (
    <>
      {error && (
        <div className={`rounded-lg border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-700 ${className}`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm text-emerald-700 ${className}`}>
          {success}
        </div>
      )}
    </>
  );
}
