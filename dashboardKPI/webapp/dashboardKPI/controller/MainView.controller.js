sap.ui.define([
    'jquery.sap.global',
	"sap/ui/model/json/JSONModel",
    "./BaseController",
    "../utilities/CommonCallManager"
], function (jQuery, JSONModel, BaseController, CommonCallManager) {
	"use strict";

	return BaseController.extend("kpmg.custom.tile.dashboardKPI.dashboardKPI.controller.MainView", {

		onInit: function () {
			BaseController.prototype.onInit.apply(this, arguments);
		},

		onBeforeRenderingPlugin: function () {
		},

        onAfterRendering: function(){
            var that=this;
            let oNavContainer=that.getView().byId("navContainer");
            that.setNavContainer(oNavContainer);
            that.navToTileView();
        },
        

	});
});