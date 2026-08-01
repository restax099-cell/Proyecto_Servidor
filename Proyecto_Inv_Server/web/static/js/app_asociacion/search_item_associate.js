import { fetchAssociateItem } from './api_asociacion.js';

export function itemAssociationManager() {
    return {
        searchQuery: '',         
        linkedXmls: [],          
        isLoadingXmls: false,

        async handleSearchInput() {
            if (this.searchQuery.length < 3) {
                this.linkedXmls = [];
                return;
            }

            this.isLoadingXmls = true;
            try {
                const response = await fetchAssociateItem(this.searchQuery);
                
                if (response && response.status === 'success') {
                    this.linkedXmls = response.data;
                }
            } catch (error) {
                console.error("Error buscando asociaciones de XML:", error);
            } finally {
                this.isLoadingXmls = false;
            }
        }
    }
}