import { useEffect } from "react";
import WingsCalendar from "./components/WingsCalendar";
import "./calendar.css";

export default function App() {
  useEffect(() => {
    console.log("APP IS RUNNING - GITHUB PAGES TEST");
  }, []);

  return (
    <div className="page">
      <h1>THIS WEEK'S LINEUP</h1>
      <WingsCalendar />
    </div>
  );
}