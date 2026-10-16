import { render } from '@testing-library/react-native';

import { AppScreen } from '@/components/ui/app-screen';

describe('AppScreen', () => {
  it('renders the supplied screen copy', async () => {
    const view = await render(
      <AppScreen title="Stores" description="Manage stores." note="Foundation only." />,
    );

    expect(view.getByText('Stores')).toBeTruthy();
    expect(view.getByText('Manage stores.')).toBeTruthy();
    expect(view.getByText('Foundation only.')).toBeTruthy();
  });
});
