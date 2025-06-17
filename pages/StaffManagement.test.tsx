/**
 * @fileoverview Comprehensive unit tests for StaffManagement component
 * @description Tests covering rendering, user interactions, edge cases, accessibility,
 * and integration workflows using Vitest and React Testing Library
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import StaffManagement from './StaffManagement';
import { staffService } from '@/lib/api/services/staffService';
import React from 'react';

// Mock external dependencies
vi.mock('@/lib/api/services/staffService', () => ({
  staffService: {
    getStaff: vi.fn(),
    createStaff: vi.fn(),
    updateStaff: vi.fn(),
    deleteStaff: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

// Test utilities
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const renderStaffManagement = (props: Record<string, any> = {}) =>
  render(
    <TestWrapper>
      <StaffManagement {...props} />
    </TestWrapper>
  );

// Mock data
const mockStaffData = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Manager',
    department: 'Operations',
    startDate: '2023-01-15',
    status: 'active',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'Developer',
    department: 'Engineering',
    startDate: '2023-03-20',
    status: 'active',
  },
];

// Setup and teardown
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('StaffManagement - Rendering', () => {
  it('renders the staff management page with correct title', async () => {
    vi.mocked(staffService.getStaff).mockResolvedValue(mockStaffData);

    renderStaffManagement();

    expect(
      screen.getByRole('heading', { name: /staff management/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/manage your team members/i)
    ).toBeInTheDocument();
  });

  it('renders loading state while fetching staff data', () => {
    vi.mocked(staffService.getStaff).mockImplementation(
      () => new Promise(() => {})
    );

    renderStaffManagement();

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText(/loading staff/i)).toBeInTheDocument();
  });

  it('renders staff list when data is loaded successfully', async () => {
    vi.mocked(staffService.getStaff).mockResolvedValue(mockStaffData);

    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });
  });

  it('renders empty state when no staff members exist', async () => {
    vi.mocked(staffService.getStaff).mockResolvedValue([]);

    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText(/no staff members found/i)).toBeInTheDocument();
      expect(
        screen.getByText(/add your first team member/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add staff member/i })
      ).toBeInTheDocument();
    });
  });

  it('renders error state when data fetching fails', async () => {
    const errorMessage = 'Failed to fetch staff data';
    vi.mocked(staffService.getStaff).mockRejectedValue(
      new Error(errorMessage)
    );

    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText(/error loading staff/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
    });
  });
});

describe('StaffManagement - User Interactions', () => {
  beforeEach(() => {
    vi.mocked(staffService.getStaff).mockResolvedValue(mockStaffData);
  });

  it('opens add staff modal when add button is clicked', async () => {
    renderStaffManagement();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add staff/i })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(/add new staff member/i)
    ).toBeInTheDocument();
  });

  it('closes modal when cancel button is clicked', async () => {
    renderStaffManagement();

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('submits form with valid staff data', async () => {
    const newStaff = {
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'Designer',
      department: 'Creative',
    };
    vi.mocked(staffService.createStaff).mockResolvedValue({
      id: '3',
      ...newStaff,
    });

    renderStaffManagement();

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/name/i), newStaff.name);
    await user.type(screen.getByLabelText(/email/i), newStaff.email);
    await user.type(screen.getByLabelText(/role/i), newStaff.role);
    await user.selectOptions(
      screen.getByLabelText(/department/i),
      newStaff.department
    );

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(staffService.createStaff).toHaveBeenCalledWith(newStaff);
    });
  });

  it('shows validation errors for invalid form data', async () => {
    renderStaffManagement();

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/role is required/i)).toBeInTheDocument();
    });
  });

  it('deletes staff member with confirmation', async () => {
    vi.mocked(staffService.deleteStaff).mockResolvedValue(undefined);

    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(
      screen.getByText(/are you sure you want to delete/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(staffService.deleteStaff).toHaveBeenCalledWith('1');
    });
  });

  it('filters staff members by search term', async () => {
    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search staff/i);
    const user = userEvent.setup();
    await user.type(searchInput, 'john');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('sorts staff members by name', async () => {
    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const sortButton = screen.getByRole('button', { name: /sort by name/i });
    fireEvent.click(sortButton);

    const staffNames = screen.getAllByTestId('staff-name');
    expect(staffNames[0]).toHaveTextContent('Jane Smith');
    expect(staffNames[1]).toHaveTextContent('John Doe');
  });
});

describe('StaffManagement - Edge Cases & Error Handling', () => {
  it('handles API timeout gracefully', async () => {
    vi.mocked(staffService.getStaff).mockRejectedValue(
      new Error('Request timeout')
    );

    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText(/request timeout/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
    });
  });

  it('handles malformed API response', async () => {
    vi.mocked(staffService.getStaff).mockResolvedValue(null as any);

    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText(/error loading staff/i)).toBeInTheDocument();
    });
  });

  it('prevents duplicate email addresses', async () => {
    renderStaffManagement();

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    });

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/email/i),
      'john@example.com'
    );

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it('handles very long names gracefully', async () => {
    const longName = 'A'.repeat(100);

    renderStaffManagement();

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/name/i), longName);

    expect(
      screen.getByDisplayValue(longName.substring(0, 50))
    ).toBeInTheDocument();
  });

  it('handles concurrent delete operations', async () => {
    vi.mocked(staffService.deleteStaff).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(deleteButtons[0]).toBeDisabled();
  });

  it('retries failed operations', async () => {
    vi.mocked(staffService.getStaff)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(mockStaffData);

    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});

describe('StaffManagement - Accessibility & Performance', () => {
  it('has proper ARIA labels and roles', async () => {
    vi.mocked(staffService.getStaff).mockResolvedValue(mockStaffData);

    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(
        screen.getByLabelText(/search staff members/i)
      ).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-label', 'Staff members');
  });

  it('supports keyboard navigation', async () => {
    vi.mocked(staffService.getStaff).mockResolvedValue(mockStaffData);

    renderStaffManagement();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add staff/i })
      ).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.tab();
    expect(
      screen.getByRole('button', { name: /add staff/i })
    ).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/search/i)).toHaveFocus();
  });

  it('announces loading states to screen readers', () => {
    vi.mocked(staffService.getStaff).mockImplementation(
      () => new Promise(() => {})
    );

    renderStaffManagement();

    const loadingRegion = screen.getByRole('status');
    expect(loadingRegion).toHaveAttribute('aria-live', 'polite');
    expect(loadingRegion).toHaveTextContent(/loading staff/i);
  });

  it('renders efficiently with large datasets', async () => {
    const largeStaffData = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Staff Member ${i + 1}`,
      email: `staff${i + 1}@example.com`,
      role: 'Employee',
      department: 'General',
      startDate: '2023-01-01',
      status: 'active',
    }));
    vi.mocked(staffService.getStaff).mockResolvedValue(largeStaffData);

    const startTime = performance.now();
    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText('Staff Member 1')).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(2000);
  });

  it('handles focus management in modals', async () => {
    vi.mocked(staffService.getStaff).mockResolvedValue(mockStaffData);

    renderStaffManagement();

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    });

    const modal = screen.getByRole('dialog');
    const firstInput = screen.getByLabelText(/name/i);

    expect(firstInput).toHaveFocus();
    expect(modal).toHaveAttribute('aria-modal', 'true');
  });
});

describe('StaffManagement - Integration Workflows', () => {
  it('completes full CRUD workflow', async () => {
    vi.mocked(staffService.getStaff).mockResolvedValue([]);
    vi.mocked(staffService.createStaff).mockResolvedValue({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'Tester',
      department: 'QA',
    });
    vi.mocked(staffService.updateStaff).mockResolvedValue({
      id: '1',
      name: 'Updated User',
      email: 'updated@example.com',
      role: 'Senior Tester',
      department: 'QA',
    });
    vi.mocked(staffService.deleteStaff).mockResolvedValue(undefined);

    renderStaffManagement();

    await waitFor(() => {
      expect(
        screen.getByText(/no staff members found/i)
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/role/i), 'Tester');
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(staffService.createStaff).toHaveBeenCalled();
    });

    vi.mocked(staffService.getStaff).mockResolvedValue([
      {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'Tester',
        department: 'QA',
        startDate: '2023-01-01',
        status: 'active',
      },
    ]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const nameInput = screen.getByDisplayValue('Test User');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated User');
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(staffService.updateStaff).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => {
      expect(staffService.deleteStaff).toHaveBeenCalledWith('1');
    });
  });
});

describe('StaffManagement - Props & State Management', () => {
  it('handles different permission levels', async () => {
    const props = { userRole: 'viewer' };
    vi.mocked(staffService.getStaff).mockResolvedValue(mockStaffData);

    renderStaffManagement(props);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: /add staff/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /edit/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /delete/i })
    ).not.toBeInTheDocument();
  });

  it('maintains search state across re-renders', async () => {
    vi.mocked(staffService.getStaff).mockResolvedValue(mockStaffData);

    const { rerender } = renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search staff/i);
    const user = userEvent.setup();
    await user.type(searchInput, 'john');

    rerender(
      <TestWrapper>
        <StaffManagement />
      </TestWrapper>
    );

    expect(screen.getByDisplayValue('john')).toBeInTheDocument();
  });

  it('handles rapid state changes correctly', async () => {
    vi.mocked(staffService.getStaff).mockResolvedValue(mockStaffData);

    renderStaffManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search staff/i);
    const user = userEvent.setup();

    await user.type(searchInput, 'johnjanetest');
    await user.clear(searchInput);
    await user.type(searchInput, 'final');

    await waitFor(() => {
      expect(screen.getByDisplayValue('final')).toBeInTheDocument();
    });
  });
});

// Additional utilities
const createMockStaffMember = (overrides: Record<string, any> = {}) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'Employee',
  department: 'General',
  startDate: '2023-01-01',
  status: 'active',
  ...overrides,
});

// Restore mocks on process exit
process.on('exit', () => {
  vi.restoreAllMocks();
});