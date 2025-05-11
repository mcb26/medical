django.jQuery(document).ready(function($) {
    var $isFullDay = $('#id_is_full_day');
    var $timeFields = $('.field-start_time, .field-end_time').closest('.form-row');
    
    function toggleTimeFields() {
        if ($isFullDay.is(':checked')) {
            $timeFields.hide();
        } else {
            $timeFields.show();
        }
    }
    
    $isFullDay.change(toggleTimeFields);
    toggleTimeFields();  // Initial ausführen
}); 