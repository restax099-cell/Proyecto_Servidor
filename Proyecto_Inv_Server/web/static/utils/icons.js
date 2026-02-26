export function renderIcon(iconName, classes = '') {
    if (!window.lucide) return '';
    const div = document.createElement('div');
    div.innerHTML = `<i data-lucide="${iconName}" class="${classes}"></i>`;
    window.lucide.createIcons({ root: div });
    return div.innerHTML;
}