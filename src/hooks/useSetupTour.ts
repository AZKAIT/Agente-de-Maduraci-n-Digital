import { useEffect } from 'react';
import Shepherd from 'shepherd.js';

const TOUR_STORAGE_KEY = 'azkait_setup_tour_completed';

export const useSetupTour = (shouldStart: boolean) => {
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
      title: 'Configuración del Diagnóstico',
      text: 'En esta sección configurarás los detalles de tu diagnóstico empresarial.',
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
      id: 'type',
      attachTo: {
        element: '#tour-setup-header',
        on: 'bottom'
      },
      title: 'Tipo de Evaluación',
      text: 'Aquí puedes ver el tipo de diagnóstico seleccionado y cambiarlo si es necesario.',
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
      id: 'interviewees',
      attachTo: {
        element: '#tour-setup-interviewees',
        on: 'bottom'
      },
      title: 'Agregar Entrevistados',
      text: 'Ingresa el nombre, rol y correo de las personas que participarán en el diagnóstico. Puedes agregar tantas como necesites.',
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
      id: 'submit',
      attachTo: {
        element: '#tour-setup-submit',
        on: 'top'
      },
      title: 'Enviar Invitaciones',
      text: 'Una vez que hayas ingresado a todos los participantes, haz clic aquí para enviarles sus invitaciones por correo electrónico.',
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
