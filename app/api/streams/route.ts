import { NextResponse } from "next/server";

export async function GET() {
  // This is your "real data layer"
  // Later you replace this with Kick API / database / etc.

  const streams = [
    {
      id: "xqc",
      name: "xQc",
      category: "Just Chatting",
      live: true,
      viewers: 12432,
    },
    {
      id: "adin",
      name: "Adin Ross",
      category: "Just Chatting",
      live: true,
      viewers: 8932,
    },
    {
      id: "gamer1",
      name: "Pro Gamer",
      category: "Gaming",
      live: true,
      viewers: 4321,
    },
    {
      id: "music1",
      name: "Live DJ",
      category: "Music",
      live: false,
      viewers: 0,
    },
    {
      id: "irl1",
      name: "IRL Walker",
      category: "IRL",
      live: true,
      viewers: 2134,
    },
  ];

  return NextResponse.json(streams);
}