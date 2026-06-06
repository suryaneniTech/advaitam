import { HostelAuthProvider } from '../hostel/hooks/useAuth';
import HostelRoutes from '../hostel/HostelRoutes';
import '../hostel/hostel.css';

export default function HostelTab() {
  return (
    <HostelAuthProvider>
      <HostelRoutes />
    </HostelAuthProvider>
  );
}
