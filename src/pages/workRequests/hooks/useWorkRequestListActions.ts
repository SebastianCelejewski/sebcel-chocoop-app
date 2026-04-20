import { useNavigate } from "react-router";

export function useWorkRequestListActions() {
    const navigate = useNavigate();
    
    function createWorkRequest() {
        const navLink = `/WorkRequestEdit/create`
        navigate(navLink)
    }

    function showWorkRequest(id: string) {
        const navLink = `/WorkRequestDetails/${id}`
        navigate(navLink)
    }

    function navigateToActivities() {
        const navLink = `/ActivityList`
        navigate(navLink)
    }

    return {
        createWorkRequest,
        showWorkRequest,
        navigateToActivities
    };
}