export default function KickStream({ channel }) {
  if (!channel) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <iframe
        src={`https://player.kick.com/BestestCreature`}
        width="100%"
        height="400"
        style={{
          border: "1px solid #222",
          borderRadius: "8px",
          background: "#000",
        }}
        allow="autoplay; fullscreen"
      />
    </div>
  );
}