// stores/uiStore.ts
import { SetStateAction } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Nerko_One } from "next/font/google";

export interface UserForm {
  name: string;
  email: string;
  phone?: string;
  password: string;
  avatarUrl: string;
  confirmPassword: string;
}

export interface TenantForm {
  businessName: string;
  subDomain: string;
  active: boolean;
  businessType: string;
  logoUrl: string;
  email: string;
  phone: string;
  address: string;
}

export interface AvailabilityForm {
  staffMember: number | null;
  type: string;
  dayOfWeek: number | null;
  startTime: string;
  specificDate: string;
  endTime: string;
}

export interface CategoryForm {
  name: string;
  description: string;
  isActive: boolean;
  displayOrder: number | null;
}

export interface AddonForm {
  name: string;
  description: string;
  priceCents: number | null;
  currency: string;
  requiresQuote: boolean;
  available: boolean;
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number; // in milliseconds, default 5000
}

interface UIState {
  // Global UI state
  sidebarOpen: boolean;
  theme: "light" | "dark";

  isPortalMode: boolean;

  currentTab: string;

  userFormData: UserForm;
  isEditingUser: boolean;
  isChangingUserPassword: boolean;

  tenantFormData: TenantForm;
  selectedTenant: TenantForm;
  isEditingTenant: boolean;

  availabilityFormData: AvailabilityForm;
  isEditingAvailability: boolean;

  categoryFormData: CategoryForm;
  isEditingCategory: boolean;

  isEditingService: boolean;

  isEditingAddon: boolean;

  notifications: Notification[];

  // Dashboard filters
  filters: {
    dateRange: { from: Date | null; to: Date | null };
    status: "all" | "pending" | "confirmed" | "cancelled";
    searchTerm: string;
    serviceId?: number;
    staffId?: number;
  };

  setCurrentTab: (tab: string) => void;

  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark") => void;
  togglePortalMode: (portalMode: boolean) => void;

  updateUserForm: (data: SetStateAction<UserForm>) => void;
  setIsEditingUser: (isEditing: boolean) => void;
  setIsChangingUserPassword: (isChanging: boolean) => void;
  resetUserForm: () => void;

  updateTenantForm: (data: SetStateAction<TenantForm>) => void;
  setSelectedTenant: (tenant: TenantForm) => void;
  setIsEditingTenant: (isEditing: boolean) => void;
  resetTenantForm: () => void;

  updateAailabilityForm: (data: SetStateAction<AvailabilityForm>) => void;
  setIsEditingAvailability: (isEditing: boolean) => void;
  resetAvailabilityForm: () => void;

  updateCategoryForm: (data: SetStateAction<CategoryForm>) => void;
  setIsEditingCategory: (isEditing: boolean) => void;
  resetCategoryForm: () => void;

  setIsEditingService: (isEditing: boolean) => void;

  setIsEditingAddon: (isEditing: boolean) => void;

  updateFilters: (filters: Partial<UIState["filters"]>) => void;
  resetFilters: () => void;

  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  showSuccess: (message: string, title?: string, duration?: number) => void;
  showError: (message: string, title?: string, duration?: number) => void;
  showWarning: (message: string, title?: string, duration?: number) => void;
  showInfo: (message: string, title?: string, duration?: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      tenantTheme: null,
      tenantfeatures: null,
      tenantIntroSettings: null,
      currentTab: "dashboard",
      isPortalMode: false,
      sidebarOpen: true,
      theme: "light",
      isBookingModalOpen: false,
      bookingFormData: {
        serviceId: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        startTime: null,
        endTime: null,
        notes: "",
      },
      userFormData: {
        name: "",
        email: "",
        avatarUrl: "",
        password: "",
        confirmPassword: "",
      },
      isEditingUser: false,
      isChangingUserPassword: false,
      tenantFormData: {
        businessName: "",
        subDomain: "",
        active: false,
        businessType: "",
        logoUrl: "",
        email: "",
        phone: "",
        address: "",
      },
      selectedTenant: {} as TenantForm,
      isEditingTenant: false,
      availabilityFormData: {
        staffMember: null,
        type: "",
        dayOfWeek: null,
        specificDate: "",
        firstName: "",
        lastName: "",
        startTime: "",
        endTime: "",
        role: "",
      },
      isEditingAvailability: false,
      categoryFormData: {
        name: "",
        description: "",
        isActive: false,
        displayOrder: null,
      },
      isEditingCategory: false,
      serviceFormData: {
        name: "",
        imageUrl: "",
        description: "",
        category: null,
        durationMinutes: null,
        priceCents: null,
        priceCurrency: "JMD",
        addons: [],
        active: true,
      },
      isEditingService: false,
      addonFormData: {
        name: "",
        description: "",
        priceCents: null,
        currency: "",
        requiresQuote: false,
        available: false,
        addons: [],
      },
      isEditingAddon: false,
      notifications: [],
      filters: {
        dateRange: { from: null, to: null },
        status: "all",
        searchTerm: "",
        serviceId: undefined,
        staffId: undefined,
      },

      setCurrentTab: (tab) => set({ currentTab: tab }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),

      togglePortalMode: (portalMode) => set({ isPortalMode: portalMode }),

      updateUserForm: (data: SetStateAction<UserForm>) => {
        set((state) => {
          let newDetails: UserForm;
          if (typeof data === "function") {
            newDetails = data(state.userFormData);
          } else {
            newDetails = { ...state.userFormData, ...data };
          }
          return { userFormData: newDetails };
        });
      },

      setIsEditingUser: (isEditing: boolean) =>
        set({ isEditingUser: isEditing }),
      setIsChangingUserPassword: (isChanging: boolean) =>
        set({ isChangingUserPassword: isChanging }),

      resetUserForm: () =>
        set({
          userFormData: {
            name: "",
            email: "",
            password: "",
            avatarUrl: "",
            confirmPassword: "",
          },
        }),

      updateTenantForm: (data: SetStateAction<TenantForm>) => {
        set((state) => {
          let newDetails: TenantForm;
          if (typeof data === "function") {
            newDetails = data(state.tenantFormData);
          } else {
            newDetails = { ...state.tenantFormData, ...data };
          }
          return { tenantFormData: newDetails };
        });
      },

      setSelectedTenant: (tenant: TenantForm) =>
        set({ selectedTenant: tenant }),
      setIsEditingTenant: (isEditing: boolean) =>
        set({ isEditingTenant: isEditing }),
      resetTenantForm: () =>
        set({
          tenantFormData: {
            businessName: "",
            subDomain: "",
            active: false,
            businessType: "",
            logoUrl: "",
            email: "",
            phone: "",
            address: "",
          },
        }),

      updateAailabilityForm: (data: SetStateAction<AvailabilityForm>) => {
        set((state) => {
          let newDetails: AvailabilityForm;
          if (typeof data === "function") {
            newDetails = data(state.availabilityFormData);
          } else {
            newDetails = { ...state.availabilityFormData, ...data };
          }
          return { availabilityFormData: newDetails };
        });
      },

      setIsEditingAvailability: (isEditing: boolean) =>
        set({ isEditingAvailability: isEditing }),
      resetAvailabilityForm: () =>
        set({
          availabilityFormData: {
            staffMember: null,
            type: "",
            dayOfWeek: null,
            specificDate: "",
            startTime: "",
            endTime: "",
          },
        }),

      updateCategoryForm: (data: SetStateAction<CategoryForm>) => {
        set((state) => {
          let newDetails: CategoryForm;
          if (typeof data === "function") {
            newDetails = data(state.categoryFormData);
          } else {
            newDetails = { ...state.categoryFormData, ...data };
          }
          return { categoryFormData: newDetails };
        });
      },

      setIsEditingCategory: (isEditing: boolean) =>
        set({ isEditingCategory: isEditing }),
      resetCategoryForm: () =>
        set({
          categoryFormData: {
            name: "",
            description: "",
            isActive: false,
            displayOrder: null,
          },
        }),

      setIsEditingService: (isEditing: boolean) =>
        set({ isEditingService: isEditing }),

      setIsEditingAddon: (isEditing: boolean) =>
        set({ isEditingAddon: isEditing }),
      updateFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      resetFilters: () =>
        set({
          filters: {
            dateRange: { from: null, to: null },
            status: "all",
            searchTerm: "",
            serviceId: undefined,
            staffId: undefined,
          },
        }),

      // Notification actions
      addNotification: (notification) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification = { ...notification, id };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove notification after duration
        const duration = notification.duration || 5000;
        setTimeout(() => {
          get().removeNotification(id);
        }, duration);
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      showSuccess: (message, title = "Success", duration = 5000) => {
        get().addNotification({
          type: "success",
          title,
          message,
          duration,
        });
      },

      showError: (message, title = "Error", duration = 5000) => {
        get().addNotification({
          type: "error",
          title,
          message,
          duration,
        });
      },

      showWarning: (message, title = "Warning", duration = 5000) => {
        get().addNotification({
          type: "warning",
          title,
          message,
          duration,
        });
      },

      showInfo: (message, title = "Info", duration = 5000) => {
        get().addNotification({
          type: "info",
          title,
          message,
          duration,
        });
      },
    }),
    {
      name: "dashboard-ui",
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        currentTab: state.currentTab,
      }),
    },
  ),
);
