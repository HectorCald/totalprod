export function flotante() {
    const btnHome = document.querySelector('.flotante .home');
    const btnPefil = document.querySelector('.flotante .perfil');
    const btnNotificacion = document.querySelector('.flotante .notificacion');
    const home = document.querySelector('.home-view');
    const perfil = document.querySelector('.perfil-view');
    const notificacion = document.querySelector('.notificacion-view');

    btnHome.addEventListener('click', () => {
        // Limpiar clases anteriores
        home.classList.remove('slide-out-flotante');
        perfil.classList.remove('slide-in-flotante');
        notificacion.classList.remove('slide-in-flotante');

        perfil.classList.add('slide-out-flotante');
        notificacion.classList.add('slide-out-flotante');
        setTimeout(() => {
            perfil.style.display = 'none';
            notificacion.style.display = 'none';
            home.style.display = 'flex';
            home.classList.remove('slide-out-flotante');
            home.classList.add('slide-in-flotante');

            setTimeout(() => {
                home.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }, 300);
        btnPefil.style.color = 'var(--text)';
        btnNotificacion.style.color = 'var(--text)';
        btnHome.style.color = 'var(--tercer-color)';
    });

    btnPefil.addEventListener('click', () => {
        // Limpiar clases anteriores
        perfil.classList.remove('slide-out-flotante');
        home.classList.remove('slide-in-flotante');
        notificacion.classList.remove('slide-in-flotante');

        home.classList.add('slide-out-flotante');
        notificacion.classList.add('slide-out-flotante');
        setTimeout(() => {
            home.style.display = 'none';
            notificacion.style.display = 'none';
            perfil.style.display = 'flex';
            perfil.classList.remove('slide-out-flotante');
            perfil.classList.add('slide-in-flotante');
        }, 300);
        btnHome.style.color = 'var(--text)';
        btnNotificacion.style.color = 'var(--text)';
        btnPefil.style.color = 'var(--tercer-color)';
    });


    btnNotificacion.addEventListener('click', () => {
        notificacion.classList.remove('slide-out-flotante');
        home.classList.remove('slide-in-flotante');
        perfil.classList.remove('slide-in-flotante');

        home.classList.add('slide-out-flotante');
        perfil.classList.add('slide-out-flotante');

        setTimeout(() => {
            home.style.display = 'none';
            perfil.style.display = 'none';
            notificacion.style.display = 'flex';
            notificacion.classList.remove('slide-out-flotante');
            notificacion.classList.add('slide-in-flotante');

            // Quitar indicador inmediatamente
            const indicador = btnNotificacion.querySelector('.indicador');
            if (indicador) indicador.remove();

            // Quitar animaciones después de 3 segundos
            setTimeout(() => {
                const notificacionesNuevas = notificacion.querySelectorAll('.notificacion.nueva-notificacion');
                notificacionesNuevas.forEach(element => {
                    element.classList.remove('nueva-notificacion');
                });
                localStorage.setItem('cantidad_notificaciones', historialNotificaciones.length.toString());
            }, 3000);
        }, 300);

        btnHome.style.color = 'var(--text)';
        btnPefil.style.color = 'var(--text)';
        btnNotificacion.style.color = 'var(--tercer-color)';
    });
}
