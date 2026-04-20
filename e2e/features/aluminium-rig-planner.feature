Feature: Aluminium rig planner
  Scenario: Planner page shows current planner UI
    Given I open the aluminium rig planner page
    Then I should see the aluminium rig planner heading
    And I should see the planner section
    And I should see the planner controls
    And I should see the cut list
    And I should see the 3D rig preview
