import { useConfirm } from "../../../hooks/useConfirm";
import { useNavigate } from "react-router";
import reportError from "../../../utils/reportError";
import WorkRequestService from "../../../services/WorkRequestService";

const workRequestService = WorkRequestService();

export function useWorkRequestActions() {

  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  function handleBack() {
    navigate("/WorkRequestList/")
  }
  
  function handleEdit(workRequestId: string) {
    navigate(`/WorkRequestEdit/update/${workRequestId}`);
  }

  async function handleDelete(workRequestId: string) {
    const ok = await confirm("Czy na pewno chcesz usunąć to zlecenie?");
    if (!ok) return;

    const result = await workRequestService.deleteWorkRequest(workRequestId);
    if (result.success) {
      navigate("/WorkRequestList");
      return;
    }

    throw new Error(reportError(result.message, result.details));
  }

  function handleDone(workRequestId: string) {
    navigate("/ActivityEdit/promoteWorkRequest/" + workRequestId);
  }

  return {
    handleBack,
    handleEdit,
    handleDelete,
    handleDone,
    dialog
  };
}