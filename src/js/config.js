(function(PLUGIN_ID) {
    'use strict';

    document.getElementById('submit').addEventListener('click', function() {
        kintone.plugin.app.setConfig({}, function() {
            alert('KinPlug Schema Extractor settings saved.\nPlease update the app to apply changes.');
            window.location.href = '../../flow?app=' + kintone.app.getId();
        });
    });

    document.getElementById('cancel').addEventListener('click', function() {
        window.location.href = '../../' + kintone.app.getId() + '/plugin/';
    });

})(kintone.$PLUGIN_ID);
