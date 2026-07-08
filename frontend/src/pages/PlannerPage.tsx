import { useNavigate } from "react-router-dom";
import PlannerChat from "../components/PlannerChat";

export default function PlannerPage() {
  const navigate = useNavigate();

  const handlePlanCreated = () => {
    // Navigate to the learn page so the user can start studying
    navigate("/learn");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Plan with AI&nbsp;
          <span className="text-sm font-medium text-text-muted align-middle">
            — describe what you want to learn
          </span>
        </h1>
        <p className="text-text-secondary mt-1.5">
          Have a conversation to design your perfect study plan. The assistant
          will ask about your goals, timeline, and preferences — then create a
          personalized plan when you're ready.
        </p>
      </div>

      <div className="card p-6">
        <PlannerChat onPlanCreated={handlePlanCreated} />
      </div>
    </div>
  );
}
