import type { Meta, StoryObj } from '@storybook/react';
import { WelcomeToArcFoundry } from './WelcomeToArcFoundry';

const meta: Meta<typeof WelcomeToArcFoundry> = {
  title: 'Components/WelcomeToArcFoundry',
  component: WelcomeToArcFoundry,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WelcomeToArcFoundry>;

export const Default: Story = {
  args: {},
};
