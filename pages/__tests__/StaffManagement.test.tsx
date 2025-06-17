import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StaffManagement from '../StaffManagement';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStaffManagement } from '../../hooks/useStaffManagement';
import { Bar, Line } from 'react-chartjs-2';

// Mock React Router navigation
const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => navigateMock,
}));

// Mock toast notifications
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock chart components
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Line: () => <div data-testid="line-chart" />,
}));

// Define mock data interfaces
interface Staff {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  skills: string[];
}
interface Analytics {
  totalStaff: number;
  activeShifts: number;
  payroll: number;
  attendance: number;
}
interface Shift {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
}
interface Performance {
  topPerformers: { id: string; name: string; metric: number }[];
}

// Base mock implementations
const mockStaff: Staff[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', position: 'Manager', department: 'Sales', skills: ['Leadership'] },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', position: 'Developer', department: 'Engineering', skills: ['React'] },
];
const mockAnalytics: Analytics = { totalStaff: 2, activeShifts: 5, payroll: 5000, attendance: 95 };
const mockShifts: Shift[] = [
  { id: 's1', staffId: '1', date: '2025-06-01', startTime: '09:00', endTime: '17:00', type: 'Regular', status: 'Scheduled' },
];
const mockPerformance: Performance = { topPerformers: [{ id: '1', name: 'John Doe', metric: 98 }] };
const mockMutations = {
  createStaff: vi.fn().mockResolvedValue(undefined),
  updateStaff: vi.fn().mockResolvedValue(undefined),
  deleteStaff: vi.fn().mockResolvedValue(undefined),
};

// Mock the useStaffManagement hook
const baseHookReturn = {
  staff: mockStaff,
  analytics: mockAnalytics,
  shifts: mockShifts,
  performance: mockPerformance.topPerformers,
  isLoading: false,
  isCRUDLoading: false,
  isError: false,
  createStaff: mockMutations.createStaff,
  updateStaff: mockMutations.updateStaff,
  deleteStaff: mockMutations.deleteStaff,
};
vi.mock('../../hooks/useStaffManagement', () => ({
  useStaffManagement: () => baseHookReturn,
}));

describe('StaffManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without errors and displays core UI elements', () => {
    const { container } = render(<StaffManagement />);
    expect(screen.getByText('Staff Management')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Staff Directory' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Performance' })).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  describe('Staff Directory tab functionality', () => {
    it('displays staff in default grid view', () => {
      render(<StaffManagement />);
      mockStaff.forEach(st => {
        expect(screen.getByText(st.name)).toBeInTheDocument();
        expect(screen.getByText(st.email)).toBeInTheDocument();
      });
    });

    it('toggles to table view and displays rows', () => {
      render(<StaffManagement />);
      userEvent.click(screen.getByRole('button', { name: 'Table View' }));
      mockStaff.forEach(st => {
        expect(screen.getByRole('row', { name: new RegExp(st.email) })).toBeInTheDocument();
      });
    });

    it('filters staff by search input', async () => {
      render(<StaffManagement />);
      const searchInput = screen.getByPlaceholderText('Search by name, email, or position');
      userEvent.type(searchInput, 'Jane');
      await waitFor(() => {
        expect(screen.queryByText('John Doe')).toBeNull();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('filters staff by department dropdown', () => {
      render(<StaffManagement />);
      const deptSelect = screen.getByLabelText('Department');
      userEvent.selectOptions(deptSelect, 'Engineering');
      expect(screen.queryByText('John Doe')).toBeNull();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('shows empty state message when no staff', () => {
      vi.mocked(useStaffManagement).mockReturnValueOnce({ ...baseHookReturn, staff: [] });
      render(<StaffManagement />);
      expect(screen.getByText('No staff found')).toBeInTheDocument();
    });
  });

  describe('Staff CRUD operations via modal form', () => {
    it('opens Add Staff modal and validates form fields', async () => {
      render(<StaffManagement />);
      userEvent.click(screen.getByRole('button', { name: 'Add Staff' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      userEvent.click(screen.getByText('Save'));
      expect(await screen.findByText('Name is required')).toBeInTheDocument();
      expect(await screen.findByText('Email is required')).toBeInTheDocument();
    });

    it('creates a staff member successfully', async () => {
      render(<StaffManagement />);
      userEvent.click(screen.getByRole('button', { name: 'Add Staff' }));
      userEvent.type(screen.getByLabelText('Name'), 'Alice');
      userEvent.type(screen.getByLabelText('Email'), 'alice@example.com');
      userEvent.type(screen.getByLabelText('Position'), 'Designer');
      userEvent.click(screen.getByText('Save'));
      await waitFor(() => expect(mockMutations.createStaff).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith('Staff member added successfully');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('handles createStaff error', async () => {
      mockMutations.createStaff.mockRejectedValueOnce(new Error('Create error'));
      render(<StaffManagement />);
      userEvent.click(screen.getByRole('button', { name: 'Add Staff' }));
      userEvent.type(screen.getByLabelText('Name'), 'Alice');
      userEvent.type(screen.getByLabelText('Email'), 'alice@example.com');
      userEvent.type(screen.getByLabelText('Position'), 'Designer');
      userEvent.click(screen.getByText('Save'));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to add staff'));
    });

    it('edits existing staff and pre-populates form', async () => {
      render(<StaffManagement />);
      userEvent.click(screen.getByRole('button', { name: /Edit John Doe/i }));
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      userEvent.clear(screen.getByLabelText('Name'));
      userEvent.type(screen.getByLabelText('Name'), 'John Updated');
      userEvent.click(screen.getByText('Save'));
      await waitFor(() => expect(mockMutations.updateStaff).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith('Staff member updated successfully');
    });
  });

  describe('Schedule tab functionality', () => {
    it('displays weekly calendar and navigates weeks', () => {
      render(<StaffManagement />);
      userEvent.click(screen.getByRole('tab', { name: 'Schedule' }));
      expect(screen.getByTestId('week-view')).toBeInTheDocument();
      userEvent.click(screen.getByRole('button', { name: 'Next Week' }));
      expect(screen.getByText(/June \d{1,2}, 2025/)).toBeInTheDocument();
    });

    it('renders shifts and opens shift details', () => {
      render(<StaffManagement />);
      userEvent.click(screen.getByRole('tab', { name: 'Schedule' }));
      expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument();
      userEvent.click(screen.getByText('09:00 - 17:00'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Status: Scheduled')).toBeInTheDocument();
    });
  });

  describe('Performance tab analytics and charts', () => {
    it('renders analytics cards with correct values', () => {
      render(<StaffManagement />);
      userEvent.click(screen.getByRole('tab', { name: 'Performance' }));
      expect(screen.getByText('Total Staff')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Active Shifts')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders top performers list and charts', () => {
      render(<StaffManagement />);
      userEvent.click(screen.getByRole('tab', { name: 'Performance' }));
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('Accessibility and interaction', () => {
    it('has proper ARIA roles and keyboard navigation', async () => {
      render(<StaffManagement />);
      const addButton = screen.getByRole('button', { name: 'Add Staff' });
      addButton.focus();
      expect(addButton).toHaveFocus();
      userEvent.keyboard('{Enter}');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles empty data sets gracefully', () => {
      vi.mocked(useStaffManagement).mockReturnValueOnce({
        ...baseHookReturn,
        staff: [],
        analytics: { totalStaff: 0, activeShifts: 0, payroll: 0, attendance: 0 },
        shifts: [],
        performance: [],
      });
      render(<StaffManagement />);
      expect(screen.getByText('No staff found')).toBeInTheDocument();
      userEvent.click(screen.getByRole('tab', { name: 'Schedule' }));
      expect(screen.getByText('No shifts scheduled')).toBeInTheDocument();
    });
  });

  it('navigates to staff detail on name click', () => {
    render(<StaffManagement />);
    userEvent.click(screen.getByText('John Doe'));
    expect(navigateMock).toHaveBeenCalledWith('/staff/1');
  });
});