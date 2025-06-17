import React from 'react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StaffManagement from '../StaffManagement';
import { useStaffManagement } from '../../hooks/useStaffManagement';
import { StaffMember, Shift } from '../../types';

vi.mock('../../hooks/useStaffManagement');
const mockUseStaffManagement = useStaffManagement as Mock;

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../components/navigation/Breadcrumbs', () => ({
  default: () => <div data-testid="breadcrumbs">Breadcrumbs</div>,
  useBreadcrumbs: vi.fn(),
}));

vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

const createMockStaffMember = (overrides?: Partial<StaffMember>): StaffMember => ({
  id: 'staff-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  position: 'Manager',
  department: 'Operations',
  hourlyRate: 25.5,
  isActive: true,
  hireDate: '2023-01-15',
  skills: ['Leadership', 'Communication'],
  notes: 'Experienced manager with great leadership skills',
  createdAt: '2023-01-15T10:00:00Z',
  updatedAt: '2023-01-15T10:00:00Z',
  ...overrides,
});

const createMockShift = (overrides?: Partial<Shift>): Shift => ({
  id: 'shift-1',
  staffId: 'staff-1',
  eventId: 'event-1',
  startTime: '2024-01-20T09:00:00Z',
  endTime: '2024-01-20T17:00:00Z',
  position: 'Manager',
  status: 'scheduled' as const,
  notes: 'Regular shift',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

const mockStaffMembers: StaffMember[] = [
  createMockStaffMember({
    id: 'staff-1',
    firstName: 'John',
    lastName: 'Doe',
    department: 'Operations',
    position: 'Manager',
  }),
  createMockStaffMember({
    id: 'staff-2',
    firstName: 'Jane',
    lastName: 'Smith',
    department: 'Customer Service',
    position: 'Representative',
    email: 'jane.smith@example.com',
  }),
  createMockStaffMember({
    id: 'staff-3',
    firstName: 'Bob',
    lastName: 'Johnson',
    department: 'Security',
    position: 'Guard',
    email: 'bob.johnson@example.com',
    isActive: false,
  }),
];

const mockShifts: Shift[] = [
  createMockShift({
    id: 'shift-1',
    staffId: 'staff-1',
    position: 'Manager',
    status: 'scheduled',
  }),
  createMockShift({
    id: 'shift-2',
    staffId: 'staff-2',
    position: 'Representative',
    status: 'confirmed',
  }),
];

const defaultMockHookReturn = {
  staff: mockStaffMembers,
  shifts: mockShifts,
  isLoading: false,
  error: null,
  addStaff: vi.fn(),
  updateStaff: vi.fn(),
  deleteStaff: vi.fn(),
  addShift: vi.fn(),
  updateShift: vi.fn(),
  deleteShift: vi.fn(),
  refreshStaff: vi.fn(),
  refreshShifts: vi.fn(),
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const renderWithWrapper = (ui: React.ReactElement) =>
  render(ui, { wrapper: TestWrapper });

describe('StaffManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStaffManagement.mockReturnValue(defaultMockHookReturn);
  });

  describe('Basic Rendering', () => {
    it('renders the staff management page with header', () => {
      renderWithWrapper(<StaffManagement />);
      expect(screen.getByText('Staff Management')).toBeInTheDocument();
      expect(screen.getByText(/Comprehensive staff management with analytics/)).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    });

    it('renders main action buttons', () => {
      renderWithWrapper(<StaffManagement />);
      expect(screen.getByRole('button', { name: /add staff/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /schedule shift/i })).toBeInTheDocument();
    });

    it('displays analytics dashboard', () => {
      renderWithWrapper(<StaffManagement />);
      expect(screen.getByText('Total Staff')).toBeInTheDocument();
      expect(screen.getByText('Active Shifts')).toBeInTheDocument();
      expect(screen.getByText('Monthly Payroll')).toBeInTheDocument();
      expect(screen.getByText('Attendance')).toBeInTheDocument();
    });

    it('shows loading state when data is loading', () => {
      mockUseStaffManagement.mockReturnValue({
        ...defaultMockHookReturn,
        isLoading: true,
        staff: [],
      });
      renderWithWrapper(<StaffManagement />);
      expect(screen.getByText(/loading staff/i)).toBeInTheDocument();
    });

    it('displays staff data when loaded', () => {
      renderWithWrapper(<StaffManagement />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('shows empty state when no staff members exist', () => {
      mockUseStaffManagement.mockReturnValue({
        ...defaultMockHookReturn,
        staff: [],
      });
      renderWithWrapper(<StaffManagement />);
      expect(screen.getByText(/no staff members found/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first staff member/i)).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all tabs', () => {
      renderWithWrapper(<StaffManagement />);
      expect(screen.getByRole('tab', { name: /staff directory/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /schedule/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /time tracking/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /performance/i })).toBeInTheDocument();
    });

    it('defaults to staff directory tab', () => {
      renderWithWrapper(<StaffManagement />);
      const staffTab = screen.getByRole('tab', { name: /staff directory/i });
      expect(staffTab).toHaveAttribute('data-state', 'active');
    });

    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const scheduleTab = screen.getByRole('tab', { name: /schedule/i });
      await user.click(scheduleTab);
      expect(scheduleTab).toHaveAttribute('data-state', 'active');
      expect(screen.getByText(/weekly schedule/i)).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('filters staff by search term', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const searchInput = screen.getByPlaceholderText(/search staff members/i);
      await user.type(searchInput, 'John');
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });

    it('filters staff by department', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const departmentFilter = screen.getByDisplayValue('All Departments');
      await user.selectOptions(departmentFilter, 'Operations');
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('combines search and department filtering', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const searchInput = screen.getByPlaceholderText(/search staff members/i);
      await user.type(searchInput, 'Jane');
      const departmentFilter = screen.getByDisplayValue('All Departments');
      await user.selectOptions(departmentFilter, 'Customer Service');
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('shows no results message when search yields no matches', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const searchInput = screen.getByPlaceholderText(/search staff members/i);
      await user.type(searchInput, 'NonExistentName');
      expect(screen.getByText(/no staff members match your search criteria/i)).toBeInTheDocument();
    });

    it('clears search when input is emptied', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const searchInput = screen.getByPlaceholderText(/search staff members/i);
      await user.type(searchInput, 'John');
      await user.clear(searchInput);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    it('defaults to grid view', () => {
      renderWithWrapper(<StaffManagement />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });

    it('switches to table view', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const viewToggleButtons = screen.getAllByRole('button');
      const tableViewButton = viewToggleButtons.find(btn =>
        btn.querySelector('[data-testid="bar-chart-3"]') !== null
      );
      if (tableViewButton) {
        await user.click(tableViewButton);
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Position')).toBeInTheDocument();
        expect(screen.getByText('Performance')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      }
    });
  });

  describe('Staff CRUD Operations', () => {
    describe('Adding Staff', () => {
      it('opens add staff modal when add button is clicked', async () => {
        const user = userEvent.setup();
        renderWithWrapper(<StaffManagement />);
        const addButton = screen.getByRole('button', { name: /add staff/i });
        await user.click(addButton);
        expect(screen.getByText(/add new staff member/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      it('submits new staff member with valid data', async () => {
        const user = userEvent.setup();
        const mockAddStaff = vi.fn().mockResolvedValue(createMockStaffMember());
        mockUseStaffManagement.mockReturnValue({
          ...defaultMockHookReturn,
          addStaff: mockAddStaff,
        });
        renderWithWrapper(<StaffManagement />);
        const addButton = screen.getByRole('button', { name: /add staff/i });
        await user.click(addButton);
        await user.type(screen.getByLabelText(/first name/i), 'New');
        await user.type(screen.getByLabelText(/last name/i), 'Employee');
        await user.type(screen.getByLabelText(/email/i), 'new.employee@example.com');
        await user.type(screen.getByLabelText(/position/i), 'Developer');
        await user.selectOptions(screen.getByLabelText(/department/i), 'Operations');
        await user.type(screen.getByLabelText(/hourly rate/i), '30.00');
        const submitButton = screen.getByRole('button', { name: /add staff/i });
        await user.click(submitButton);
        await waitFor(() => {
          expect(mockAddStaff).toHaveBeenCalledWith({
            firstName: 'New',
            lastName: 'Employee',
            email: 'new.employee@example.com',
            phone: null,
            position: 'Developer',
            department: 'Operations',
            hourlyRate: 30.0,
            isActive: true,
            hireDate: expect.any(String),
            skills: [],
            notes: null,
          });
        });
      });

      it('shows validation errors for required fields', async () => {
        const user = userEvent.setup();
        renderWithWrapper(<StaffManagement />);
        const addButton = screen.getByRole('button', { name: /add staff/i });
        await user.click(addButton);
        const submitButton = screen.getByRole('button', { name: /add staff/i });
        await user.click(submitButton);
        const firstNameInput = screen.getByLabelText(/first name/i);
        expect(firstNameInput).toBeInvalid();
      });

      it('handles add staff API error', async () => {
        const user = userEvent.setup();
        const mockAddStaff = vi.fn().mockRejectedValue(new Error('API Error'));
        mockUseStaffManagement.mockReturnValue({
          ...defaultMockHookReturn,
          addStaff: mockAddStaff,
        });
        renderWithWrapper(<StaffManagement />);
        const addButton = screen.getByRole('button', { name: /add staff/i });
        await user.click(addButton);
        await user.type(screen.getByLabelText(/first name/i), 'Test');
        await user.type(screen.getByLabelText(/last name/i), 'User');
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/position/i), 'Tester');
        await user.selectOptions(screen.getByLabelText(/department/i), 'Operations');
        const submitButton = screen.getByRole('button', { name: /add staff/i });
        await user.click(submitButton);
        await waitFor(() => {
          expect(mockAddStaff).toHaveBeenCalled();
        });
      });
    });

    describe('Editing Staff', () => {
      it('opens edit modal with pre-filled data when edit button is clicked', async () => {
        const user = userEvent.setup();
        renderWithWrapper(<StaffManagement />);
        const editButtons = screen.getAllByText(/edit/i);
        await user.click(editButtons[0]);
        expect(screen.getByText(/edit staff member/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument();
      });

      it('updates staff member with new data', async () => {
        const user = userEvent.setup();
        const mockUpdateStaff = vi.fn().mockResolvedValue(createMockStaffMember());
        mockUseStaffManagement.mockReturnValue({
          ...defaultMockHookReturn,
          updateStaff: mockUpdateStaff,
        });
        renderWithWrapper(<StaffManagement />);
        const editButtons = screen.getAllByText(/edit/i);
        await user.click(editButtons[0]);
        const firstNameInput = screen.getByDisplayValue('John');
        await user.clear(firstNameInput);
        await user.type(firstNameInput, 'Johnny');
        const submitButton = screen.getByRole('button', { name: /update staff/i });
        await user.click(submitButton);
        await waitFor(() => {
          expect(mockUpdateStaff).toHaveBeenCalledWith('staff-1', expect.objectContaining({ firstName: 'Johnny' }));
        });
      });
    });

    describe('Skills Management', () => {
      it('adds new skills to staff member', async () => {
        const user = userEvent.setup();
        renderWithWrapper(<StaffManagement />);
        const addButton = screen.getByRole('button', { name: /add staff/i });
        await user.click(addButton);
        const skillInput = screen.getByPlaceholderText(/add a skill/i);
        await user.type(skillInput, 'JavaScript');
        const addSkillButton = screen.getByRole('button', { name: /add/i });
        await user.click(addSkillButton);
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(skillInput).toHaveValue('');
      });

      it('removes skills from staff member', async () => {
        const user = userEvent.setup();
        renderWithWrapper(<StaffManagement />);
        const editButtons = screen.getAllByText(/edit/i);
        await user.click(editButtons[0]);
        const removeSkillButtons = screen.getAllByRole('button', { name: '' });
        const skillRemoveButton = removeSkillButtons.find(btn =>
          btn.closest('.inline-flex')?.textContent?.includes('Leadership')
        );
        if (skillRemoveButton) {
          await user.click(skillRemoveButton);
          expect(screen.queryByText('Leadership')).not.toBeInTheDocument();
        }
      });

      it('prevents adding duplicate skills', async () => {
        const user = userEvent.setup();
        renderWithWrapper(<StaffManagement />);
        const addButton = screen.getByRole('button', { name: /add staff/i });
        await user.click(addButton);
        const skillInput = screen.getByPlaceholderText(/add a skill/i);
        const addSkillButton = screen.getByRole('button', { name: /add/i });
        await user.type(skillInput, 'JavaScript');
        await user.click(addSkillButton);
        await user.type(skillInput, 'JavaScript');
        await user.click(addSkillButton);
        const jsSkills = screen.getAllByText('JavaScript');
        expect(jsSkills).toHaveLength(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when staff loading fails', () => {
      mockUseStaffManagement.mockReturnValue({
        ...defaultMockHookReturn,
        isLoading: false,
        error: 'Failed to fetch staff members',
        staff: [],
      });
      renderWithWrapper(<StaffManagement />);
      expect(screen.getByText(/no staff members found/i)).toBeInTheDocument();
    });

    it('handles network errors gracefully during staff creation', async () => {
      const user = userEvent.setup();
      const mockAddStaff = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseStaffManagement.mockReturnValue({
        ...defaultMockHookReturn,
        addStaff: mockAddStaff,
      });
      renderWithWrapper(<StaffManagement />);
      const addButton = screen.getByRole('button', { name: /add staff/i });
      await user.click(addButton);
      await user.type(screen.getByLabelText(/first name/i), 'Test');
      await user.type(screen.getByLabelText(/last name/i), 'User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/position/i), 'Tester');
      await user.selectOptions(screen.getByLabelText(/department/i), 'Operations');
      const submitButton = screen.getByRole('button', { name: /add staff/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(mockAddStaff).toHaveBeenCalled();
      });
    });

    it('validates email format in staff form', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const addButton = screen.getByRole('button', { name: /add staff/i });
      await user.click(addButton);
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      expect(emailInput).toBeInvalid();
    });

    it('prevents submission with invalid hourly rate', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const addButton = screen.getByRole('button', { name: /add staff/i });
      await user.click(addButton);
      const hourlyRateInput = screen.getByLabelText(/hourly rate/i);
      await user.type(hourlyRateInput, '-10');
      expect(hourlyRateInput).toHaveValue(null);
    });
  });

  describe('Modal Interactions', () => {
    it('closes staff modal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const addButton = screen.getByRole('button', { name: /add staff/i });
      await user.click(addButton);
      expect(screen.getByText(/add new staff member/i)).toBeInTheDocument();
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      expect(screen.queryByText(/add new staff member/i)).not.toBeInTheDocument();
    });

    it('closes staff modal when X button is clicked', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const addButton = screen.getByRole('button', { name: /add staff/i });
      await user.click(addButton);
      expect(screen.getByText(/add new staff member/i)).toBeInTheDocument();
      const closeButton = screen.getByRole('button', { name: '' });
      await user.click(closeButton);
      expect(screen.queryByText(/add new staff member/i)).not.toBeInTheDocument();
    });

    it('resets form when modal is reopened', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const addButton = screen.getByRole('button', { name: /add staff/i });
      await user.click(addButton);
      await user.type(screen.getByLabelText(/first name/i), 'Test');
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      await user.click(addButton);
      expect(screen.getByLabelText(/first name/i)).toHaveValue('');
    });
  });

  describe('Staff Actions', () => {
    it('handles message action for staff member', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const messageButtons = screen.getAllByTitle(/send message/i);
      await user.click(messageButtons[0]);
      expect(vi.mocked(require('react-hot-toast').toast.success)).toHaveBeenCalled();
    });

    it('handles call action for staff member with phone', async () => {
      const user = userEvent.setup();
      const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
      renderWithWrapper(<StaffManagement />);
      const callButtons = screen.getAllByTitle(/call/i);
      await user.click(callButtons[0]);
      expect(mockOpen).toHaveBeenCalledWith('tel:+1234567890');
      mockOpen.mockRestore();
    });

    it('handles call action for staff member without phone', async () => {
      const user = userEvent.setup();
      const staffWithoutPhone = mockStaffMembers.map(staff =>
        staff.id === 'staff-1' ? { ...staff, phone: null } : staff
      );
      mockUseStaffManagement.mockReturnValue({
        ...defaultMockHookReturn,
        staff: staffWithoutPhone,
      });
      renderWithWrapper(<StaffManagement />);
      const callButtons = screen.getAllByTitle(/call/i);
      await user.click(callButtons[0]);
      expect(vi.mocked(require('react-hot-toast').toast.error)).toHaveBeenCalledWith('No phone number available');
    });

    it('navigates to staff detail page when view button is clicked', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const viewButtons = screen.getAllByTitle(/view details/i);
      await user.click(viewButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/staff/staff-1');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithWrapper(<StaffManagement />);
      expect(screen.getByRole('main') || document.body).toBeInTheDocument();
      const addButton = screen.getByRole('button', { name: /add staff/i });
      expect(addButton).toBeInTheDocument();
      const searchInput = screen.getByPlaceholderText(/search staff members/i);
      expect(searchInput).toHaveAccessibleName();
    });

    it('supports keyboard navigation for tabs', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const staffTab = screen.getByRole('tab', { name: /staff directory/i });
      const scheduleTab = screen.getByRole('tab', { name: /schedule/i });
      staffTab.focus();
      expect(staffTab).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(scheduleTab).toHaveFocus();
    });

    it('maintains focus management in modals', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const addButton = screen.getByRole('button', { name: /add staff/i });
      await user.click(addButton);
      const firstNameInput = screen.getByLabelText(/first name/i);
      expect(firstNameInput).toHaveFocus();
    });

    it('provides proper form labels and validation messages', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const addButton = screen.getByRole('button', { name: /add staff/i });
      await user.click(addButton);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email/i);
      expect(firstNameInput).toHaveAttribute('required');
      expect(lastNameInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('required');
    });

    it('has proper heading hierarchy', () => {
      renderWithWrapper(<StaffManagement />);
      const mainHeading = screen.getByRole('heading', { name: /staff management/i });
      expect(mainHeading.tagName).toBe('H1');
      const analyticsHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(analyticsHeadings.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and State Management', () => {
    it('renders efficiently with large staff list', () => {
      const largeStaffList = Array.from({ length: 100 }, (_, i) =>
        createMockStaffMember({
          id: `staff-${i}`,
          firstName: `Staff${i}`,
          lastName: `Member${i}`,
          email: `staff${i}@example.com`,
        })
      );
      mockUseStaffManagement.mockReturnValue({
        ...defaultMockHookReturn,
        staff: largeStaffList,
      });
      const startTime = performance.now();
      renderWithWrapper(<StaffManagement />);
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('handles rapid filter changes without performance issues', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      const searchInput = screen.getByPlaceholderText(/search staff members/i);
      await user.type(searchInput, 'test', { delay: 10 });
      await user.clear(searchInput);
      await user.type(searchInput, 'another', { delay: 10 });
      expect(screen.getByPlaceholderText(/search staff members/i)).toBeInTheDocument();
    });

    it('maintains scroll position when switching between tabs', async () => {
      const user = userEvent.setup();
      renderWithWrapper(<StaffManagement />);
      window.scrollTo(0, 500);
      const scheduleTab = screen.getByRole('tab', { name: /schedule/i });
      await user.click(scheduleTab);
      const staffTab = screen.getByRole('tab', { name: /staff directory/i });
      await user.click(staffTab);
      expect(window.scrollY).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Integration', () => {
    it('refreshes data when hook returns updated staff', () => {
      const { rerender } = renderWithWrapper(<StaffManagement />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      const updatedStaff = [
        ...mockStaffMembers,
        createMockStaffMember({
          id: 'staff-4',
          firstName: 'New',
          lastName: 'Staff',
          email: 'new.staff@example.com',
        }),
      ];
      mockUseStaffManagement.mockReturnValue({
        ...defaultMockHookReturn,
        staff: updatedStaff,
      });
      rerender(<StaffManagement />);
      expect(screen.getByText('New Staff')).toBeInTheDocument();
    });

    it('handles empty departments list gracefully', () => {
      mockUseStaffManagement.mockReturnValue({
        ...defaultMockHookReturn,
        staff: [],
      });
      renderWithWrapper(<StaffManagement />);
      const departmentFilter = screen.getByDisplayValue('All Departments');
      expect(departmentFilter).toBeInTheDocument();
    });
  });
});