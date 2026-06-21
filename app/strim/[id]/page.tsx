import BackButton from "@/components/BackButton";

type Props = {
  params: { id: string };
};

export default function StreamPage({ params }: Props) {
  const { id } = params;

  return (
    <div className="container">
      <BackButton />

      <h1>Stream: {id}</h1>

      <div
        style={{
          marginTop: 20,
          background: "#111",
          border: "1px solid #333",
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p>Player placeholder (embed goes here)</p>
      </div>
    </div>
  );
}