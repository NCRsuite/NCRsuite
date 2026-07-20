import { useOrganization } from '../contexts/OrganizationContext';
import { BookingDashboardPage } from './BookingDashboardPage';
import { TrainingDashboardPage } from './TrainingDashboardPage';
import { SecurityDashboardPage } from './SecurityDashboardPage';
import { SecurityAgentPortalPage } from './SecurityAgentPortalPage';
import { CleaningDashboardPage } from './CleaningDashboardPage';
import { CleaningAgentPortalPage } from './CleaningAgentPortalPage';
import { RestaurantDashboardPage } from './RestaurantDashboardPage';
import { RestaurantEmployeePortalPage } from './RestaurantEmployeePortalPage';

export function DashboardPage() {
  const { organization } = useOrganization();
  if (!organization) return null;
  if (organization.business_type === 'coiffure') return <BookingDashboardPage />;
  if (organization.business_type === 'formation') return <TrainingDashboardPage />;
  if (organization.business_type === 'securite') return organization.role === 'employee' ? <SecurityAgentPortalPage /> : <SecurityDashboardPage />;
  if (organization.business_type === 'nettoyage') return organization.role === 'employee' ? <CleaningAgentPortalPage /> : <CleaningDashboardPage />;
  return organization.role === 'employee' ? <RestaurantEmployeePortalPage /> : <RestaurantDashboardPage />;
}
