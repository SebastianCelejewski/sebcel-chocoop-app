import { useNavigate } from "react-router";
import { useConfirm } from "../../../hooks/useConfirm";
import reportError from "../../../utils/reportError";
import ActivityService from "../../../services/ActivityService";

const activityService = ActivityService();

export function useActivityActions() {

  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  function handleBack() {
    navigate("/ActivityList/")
  }
  
  function handleEdit(activityId: string) {
    navigate(`/ActivityEdit/update/${activityId}`)
  }
  
  async function handleDelete(activityId: string) {
    const ok = await confirm("Czy na pewno usunąć aktywność?");
    if (!ok) return;

    const result = await activityService.deleteActivity(activityId);
    if (result.success) {
      navigate("/ActivityList");
      return;
    }

    throw new Error(reportError(result.message, result.details));
  }

  async function handleAddReaction(activityId: string, userId: string, reaction: string) {
    const result = await activityService.addReaction(activityId, userId, reaction);
    if (!result.success) {
      reportError("Failed to create reaction: " + JSON.stringify(result));
    }
  }

  return {
    handleBack,
    handleEdit,
    handleDelete,
    handleAddReaction,
    dialog
  };
}