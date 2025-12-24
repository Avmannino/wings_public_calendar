import WingsCalendar from "./components/WingsCalendar";
import "./calendar.css";

export default function App() {
  return (
    <div className="page">
      <h1>THIS WEEK'S LINEUP</h1>
      <WingsCalendar />
    </div>
  );
}
