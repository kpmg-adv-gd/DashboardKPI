sap.ui.define([
    'jquery.sap.global',
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "./BaseController",
    "../utilities/CommonCallManager"
], function (jQuery, JSONModel, Filter, FilterOperator, BaseController, CommonCallManager) {
	"use strict";

	return BaseController.extend("kpmg.custom.tile.dashboardKPI.dashboardKPI.controller.DashboardSelectionView", {
        oDashboardModel: new JSONModel(),

		onInit: function () {
            this.getView().setModel(this.oDashboardModel, "DashboardModel");
            sap.ui.getCore().getEventBus().subscribe("DashboardMessage", "refreshSelection", this.refreshSelection, this);
		},

        onAfterRendering: function(){
            var that = this;
			that.getProjects();
			that.getPhases();
			that.getCustomers();
			that.getSections();
			that.loadPodIdValues();
        },

        refreshSelection: function () {
            var that = this;
            that.oDashboardModel.refresh();
        },

        // Ottengo lista dei Progetti
        getProjects: function () {
            var that = this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/api/getProjectsVerbaliSupervisoreAssembly";
            let url = BaseProxyURL + pathOrderBomApi; 
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params = {
                plant: plant,
            };

            var successCallback = function(response) {
                that.oDashboardModel.setProperty("/projects", response);
            };
            
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },
		// Ottengo liste delle Fasi
		getPhases: function () {
			var that = this;
			var response = [{"phase": "Assembly"}];
            that.oDashboardModel.setProperty("/phases", response);
		},
		// Ottengo lista dei Clienti
		getCustomers: function () {
			var that = this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let url = BaseProxyURL + "/api/getCustomersVerbaliSupervisoreAssembly";
            var plant = that.getInfoModel().getProperty("/plant");
            var successCallback = function(response) {
                that.oDashboardModel.setProperty("/customers", response);
            };
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, { plant: plant }, true, successCallback, errorCallback, that);
		},
		// Ottengo lista delle Sezioni
		getSections: function () {
			var that = this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let url = BaseProxyURL + "/api/getSectionsVerbaliSupervisoreAssembly";
            var plant = that.getInfoModel().getProperty("/plant");
            var successCallback = function(response) {
                that.oDashboardModel.setProperty("/sections", response);
            };
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
            };
            CommonCallManager.callProxy("POST", url, { plant: plant }, true, successCallback, errorCallback, that);
		},

		loadPodIdValues: function() {
            var that = this;
            var BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            var url = BaseProxyURL + "/db/getPodIdValues";
            var plant = that.getInfoModel().getProperty("/plant");

            var successCallback = function(response) {
                that.getInfoModel().setProperty("/podIdValues", response || {});
            };
            var errorCallback = function(error) {
                console.log("Errore caricamento POD_ID_VALUE:", error);
                that.getInfoModel().setProperty("/podIdValues", {});
            };
            CommonCallManager.callProxy("POST", url, { plant: plant }, true, successCallback, errorCallback, that);
        },

		// Carico dati tabella
        loadData: function () {
            var that = this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/db/getDataFilterDashboardKPI";
            let url = BaseProxyURL + pathOrderBomApi; 
            
            var plant = that.getInfoModel().getProperty("/plant");

            let params = {
                plant: plant,
				project: that.byId("dashboardProjectFilter").getSelectedKey(),
				phase: that.byId("dashboardPhaseFilter").getSelectedKey(),
				customer: that.byId("dashboardCustomerFilter").getSelectedKey(),
				section: that.byId("dashboardSectionFilter").getSelectedKey()
            };

            var successCallback = function(response) {
            	that.oDashboardModel.setProperty("/BusyLoadingTable", false);
                that.oDashboardModel.setProperty("/tableData", response);
            };
            
            var errorCallback = function(error) {
            	that.oDashboardModel.setProperty("/BusyLoadingTable", false);
                that.showErrorMessageBox(error);
            };

            that.oDashboardModel.setProperty("/BusyLoadingTable", true);
            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

		// Ricerca
		onSearchPress: function() {
			var that = this;
			that.loadData();
		},

		// Azzera filtri
		onClearPress: function() {
			var oView = this.getView();
			oView.byId("dashboardProjectFilter").setSelectedKey("");
			oView.byId("dashboardPhaseFilter").setSelectedKey("");
			oView.byId("dashboardCustomerFilter").setSelectedKey("");
			oView.byId("dashboardSectionFilter").setSelectedKey("");
			this.oDashboardModel.setProperty("/tableData", []);
		},

		// Expand All
		onExpandAll: function() {
			var oTable = this.byId("dashboardTable");
			if (oTable) oTable.expandToLevel(1);
		},

		// Collapse All
		onCollapseAll: function() {
			var oTable = this.byId("dashboardTable");
			if (oTable) oTable.collapseAll();
		},

		// Gestione selezione riga
		onRowSelectionChange: function(oEvent) {
			var that = this;
			var oTable = oEvent.getSource();
			var iSelectedIndex = oTable.getSelectedIndex();
			
			if (iSelectedIndex >= 0) {
				var oContext = oTable.getContextByIndex(iSelectedIndex);
				var oSelectedData = oContext.getObject();
				
				// Naviga solo se è un child (ha sfc valorizzato)
				if (oSelectedData && oSelectedData.sfc) {
					// Usa project_parent per il progetto (il campo project è vuoto nei child)
					oSelectedData.project = oSelectedData.project_parent || oSelectedData.project || "";
					// Salva i dati selezionati nel modello globale
					that.getInfoModel().setProperty("/selectedRow", oSelectedData);
					
					// Naviga alla dashboard KPI
					that.navToKPIDashboardView();
				}
			}
		},
		
		// Formatter Status icon
		getStatusIcon: function(executionStatus) {
			switch (executionStatus) {
				case "ACTIVE":
					return "sap-icon://lateness";
				case "COMPLETED":
					return "sap-icon://complete";
				default:
					return "sap-icon://decline";
			}
		},

		// Formatter Status color
		getStatusColor: function(executionStatus) {
			switch (executionStatus) {
				case "ACTIVE":
					return "#d19e13";
				case "COMPLETED":
					return "green";
				default:
					return "red";
			}
		},

		// Navigazione alla KPI Dashboard
		navToKPIDashboardView: function() {
		    var that = this;
		    var oDashboardNavContainer = that.getInfoModel().getProperty("/oNavContainer");
		    var KPIDashboardView = "kpmg.custom.tile.dashboardKPI.dashboardKPI.view.KPIDashboardView";
		    
		    var oExistingView = oDashboardNavContainer.getPages().find(function(oPage) {
		        return oPage.getViewName() === KPIDashboardView;
		    });
		    
		    if (oExistingView) {
		        oDashboardNavContainer.to(oExistingView);
		        var oController = oExistingView.getController();
		        if (oController && oController.onNavigateTo) {
		            oController.onNavigateTo();
		        }
		    } else {
		        sap.ui.core.mvc.XMLView.create({
		            viewName: KPIDashboardView
		        }).then(function(oView) {
		            oDashboardNavContainer.addPage(oView);
		            oDashboardNavContainer.to(oView);
		            var oController = oView.getController();
		            if (oController && oController.onNavigateTo) {
		                oController.onNavigateTo();
		            }
		        });
		    }
		}

	});
});