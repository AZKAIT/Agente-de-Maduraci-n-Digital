import { useEffect } from 'react';
import Shepherd from 'shepherd.js';

const TOUR_STORAGE_KEY = 'azkait_interview_tour_completed';

export const useInterviewTour = (shouldStart: boolean) => {
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
      title: '¡Bienvenido a tu Entrevista!',
      text: 'Estás a punto de comenzar tu diagnóstico de madurez digital con Christina. Permítenos mostrarte los controles.',
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
      id: 'interview-card',
      attachTo: {
        element: '#tour-interview-card',
        on: 'right'
      },
      title: 'La Entrevista con Christina',
      text: 'Este es el panel principal. Aquí verás a Christina y podrás interactuar con ella por voz. Recuerda presionar el micrófono para hablar.',
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
      id: 'sidebar',
      attachTo: {
        element: '#tour-interview-sidebar',
        on: 'left'
      },
      title: 'Participantes y Avance',
      text: 'En este panel podrás ver quiénes más están participando en el diagnóstico y el progreso actual de cada uno.',
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
      id: 'toggle-chat',
      attachTo: {
        element: '#tour-toggle-chat',
        on: 'bottom'
      },
      title: 'Mostrar Historial',
      text: 'Si prefieres leer la conversación, haz clic aquí para mostrar el panel de historial con las transcripciones en tiempo real.',
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
      id: 'chat-panel',
      attachTo: {
        element: '#tour-chat-panel',
        on: 'right'
      },
      title: 'Panel de Historial',
      text: 'Aquí verás todo lo que has hablado con Christina. Puedes ocultarlo en cualquier momento usando el botón de cerrar (X) o el mismo icono de chat.',
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
    }, 800);

    return () => {
      clearTimeout(timer);
      if (tour.isActive()) {
        tour.complete();
      }
    };
  }, [shouldStart]);
};
