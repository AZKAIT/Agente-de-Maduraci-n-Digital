import { useEffect } from 'react';
import Shepherd from 'shepherd.js';

const TOUR_STORAGE_KEY = 'azkait_dashboard_tour_completed';

export const useDashboardTour = (shouldStart: boolean) => {
  useEffect(() => {
    if (!shouldStart) return;

    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (tourCompleted === 'true') return;

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shepherd-element shadow-2xl',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: {
            enabled: true
        }
      }
    });

    const setTourCompleted = () => {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    };

    tour.on('complete', setTourCompleted);
    tour.on('cancel', setTourCompleted);

    tour.addStep({
      id: 'welcome',
      title: '¡Bienvenido a tu Dashboard!',
      text: 'Este es el centro de control de tus diagnósticos de madurez digital. Permítenos mostrarte cómo funciona.',
      buttons: [
        {
          text: 'Saltar',
          action: tour.cancel,
          classes: 'shepherd-button shepherd-button-secondary'
        },
        {
          text: 'Siguiente',
          action: tour.next,
          classes: 'shepherd-button shepherd-button-primary'
        }
      ]
    });

    tour.addStep({
      id: 'new-diagnostic',
      attachTo: {
        element: '#tour-new-diagnostic',
        on: 'bottom'
      },
      title: 'Inicia un Diagnóstico',
      text: 'Haz clic aquí para comenzar un nuevo diagnóstico de IA para tu empresa o proyecto.',
      buttons: [
        {
          text: 'Anterior',
          action: tour.back,
          classes: 'shepherd-button shepherd-button-secondary'
        },
        {
          text: 'Siguiente',
          action: tour.next,
          classes: 'shepherd-button shepherd-button-primary'
        }
      ]
    });

    tour.addStep({
      id: 'tabs',
      attachTo: {
        element: '#tour-tabs',
        on: 'bottom'
      },
      title: 'Tus Proyectos e Invitaciones',
      text: 'Cambia entre "Mis Proyectos" para ver los que creaste tú, o "Invitaciones" para ver diagnósticos a los que fuiste invitado.',
      buttons: [
        {
          text: 'Anterior',
          action: tour.back,
          classes: 'shepherd-button shepherd-button-secondary'
        },
        {
          text: 'Siguiente',
          action: tour.next,
          classes: 'shepherd-button shepherd-button-primary'
        }
      ]
    });

    tour.addStep({
      id: 'table',
      attachTo: {
        element: '#tour-table',
        on: 'top'
      },
      title: 'Estado de Avance',
      text: 'Aquí podrás ver el progreso de cada diagnóstico, la fecha de creación y acceder a los reportes una vez finalizados.',
      buttons: [
        {
          text: 'Anterior',
          action: tour.back,
          classes: 'shepherd-button shepherd-button-secondary'
        },
        {
          text: 'Finalizar',
          action: tour.complete,
          classes: 'shepherd-button shepherd-button-primary'
        }
      ]
    });

    // Start tour after a short delay to ensure elements are rendered
    const timer = setTimeout(() => {
      tour.start();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (tour.isActive()) {
        tour.complete();
      }
    };
  }, [shouldStart]);
};
