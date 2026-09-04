interface Props {
  message: string | null;
}

export function Toast({ message }: Props) {
  if (!message) return null;
  return (
    <div
      style={{ backgroundColor: "#E3A857", color: "#1B1A17" }}
      className="fixed top-3 left-1/2 -translate-x-1/2 rounded-md px-3 py-1.5 text-xs font-medium shadow z-50"
    >
      {message}
    </div>
  );
}
