import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { Icon } from './Icon';

export function MetierWorkspaceShortcut() {
  const navigate = useNavigate();
  const { organization } = useOrganization();

  if (organization?.plan !== 'metier' || !['owner', 'admin'].includes(organization.role ?? 'viewer')) {
    return null;
  }

  return (
    <button type="button" className="metier-workspace-floating-shortcut" onClick={() => navigate('/offre-metier')}>
      <span><Icon name="building" size={19} /></span>
      <span><strong>Mon espace</strong><small>Entreprises · secrétariat · pages publiques</small></span>
      <Icon name="chevronRight" size={16} />
    </button>
  );
}
