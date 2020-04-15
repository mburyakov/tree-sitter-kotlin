/*
 * MIT License
 * 
 * Copyright (c) 2019 fwcd
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Using an adapted version of https://kotlinlang.org/docs/reference/grammar.html

const PREC = {
	// 'dynamic?' means dynamic type
	// 'import' 'x' -- not infix call but import statement
	// 'internal' 'open' 'class' -- not infix call but class declaration
	SIMPLE_IDENTIDIER: -2,
	TYPE_REFERENCE: -1,

	// lambda literal without parameters look same as block, block is preferred when both suitable (inside 'do { } while (true) ')
	BLOCK: 0,
	LAMBDA_LITERAL: -1,

	// label for expression statement is on the statement instead of expression
	// annotation for value argument is on the argument instead of expression
	VALUE_ARGUMENT: 1,
	STATEMENT_LABEL: 1,
	UNARY_PREFIX: 0,

	// precedence is here for not allowing such constructions looking like (incomplete) infix call:
	// val x: Int = 1 get
	// class A<T>(val x : I) : I by x where T : I
	INFIX_CALL: 0,
	ELVIS: -1,
};

module.exports = grammar({
	name: "kotlin",
	
	conflicts: $ => [
		// Ambiguous when used in an explicit delegation expression,
		// since the '{' could either be interpreted as the class body
		// or as the anonymous function body. Consider the following sequence:
		//
		// 'class'  simple_identifier  ':'  user_type  'by'  'fun'  '('  ')'  •  '{'  …
		//
		// Possible interpretations:
		//
		// 'class'  simple_identifier  ':'  user_type  'by'  (anonymous_function  'fun'  '('  ')'  •  function_body)
		// 'class'  simple_identifier  ':'  user_type  'by'  (anonymous_function  'fun'  '('  ')')  •  '{'  …
		//[$.anonymous_function],

		// Member access operator '::' conflicts with callable reference
		//[$.primaryExpression, $.simpleUserType, $.valueArgument],
		[$.primaryExpression, $.simpleUserType, $.parameter],
		[$.primaryExpression, $.simpleUserType],

		[$.primaryExpression, $.simpleUserType, $.parameter, $.directlyAssignableExpression],
		// '(Type)::something()' starts similar with '(x) + 1'
		[$.primaryExpression, $.simpleUserType, $.directlyAssignableExpression],

		// type arguments conflict with comparison operator
		[$.postfixUnaryExpression],

		[$.typeReference, $.userType],

        // getter can be confused with subsequent declaration:
		// val x = 5 • public get
		[$.property_declaration],

		// to recognize such as 'label@x++'
		[$.label, $.primaryExpression],

		// to distinguish expression/assignableExpression/directlyAssignableExpression
		[$.prefixUnaryExpression, $.directlyAssignableExpression],
		[$.asExpression, $.assignableExpression],

		// for such anonymous functions as 'fun (Int).():Int'
		[$.parameter_modifiers, $.typeModifier],
		[$.simpleUserType, $.parameterWithOptionalType],

		// '(@Annotation T)?::field
		[$.unaryPrefix, $.typeModifier],

		// 'val (@A C).x' and 'val (@A x)'
		[$.variable_declaration, $.typeModifier],

		// 'val (C).x' and 'val (x)'
		[$.variable_declaration, $.simpleUserType],
	],

	extras: $ => [$.WS, $.Hidden],
	word: $ => $.Identifier,

	rules: {
		// ====================
		// Syntax grammar
		// ====================

		// ==========
		// General
		// ==========

		source_file: $ => seq(
			optional($.shebang_line),
			optional($.NLS),
			optional(seq(repeat1($.file_annotation))),
			optional($.package_header),
			repeat($.import_header),
			repeat(seq($._statement, $._semis)),
			optional($._statement)
		),

		// TODO:
		// should we distinguish script and
		// kotlinFile where only top-level objects should be allowed?

		shebang_line: $ => /#![^\r\n]*/,

		file_annotation: $ => seq(
			"@file",
			optional($.NLS),
			$.COLON,
			optional($.NLS),
			choice(
				seq($.LSQUARE, repeat1($.unescaped_annotation), $.RSQUARE),
				$.unescaped_annotation
			),
			optional($.NLS),
		),

		package_header: $ => seq("package", $.identifier, optional($.semi)),

		import_header: $ => seq(
			$.IMPORT,
			$.identifier,
			optional(choice(seq(".*"), $.import_alias)),
			optional($._semi),
		),

		// TODO: why type identifier by default?
		import_alias: $ => seq("as", alias($.simpleIdentifier, $.type_identifier)),

		type_alias: $ => seq(
			optional($.modifiers),
			"typealias",
			optional($.NLS),
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				optional($.NLS),
				$.type_parameters,
			)),
			optional($.NLS),
			"=",
			$.type
		),

		_declaration: $ => choice(
			$.class_declaration,
			$.object_declaration,
			$.function_declaration,
			$.property_declaration,
			$.type_alias
		),

		// ==========
		// Classes
		// ==========

		class_declaration: $ => seq(
			optional($.modifiers),
			choice($.CLASS, "interface"),
			optional($.NLS),
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				// TODO: all omitted NLS
				//optional($.NLS),
				$.type_parameters,
			)),
			optional(seq(
				//optional($.NLS),
				$.primary_constructor,
			)),
			optional(seq(
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._delegation_specifiers
			)),
			optional(seq(
				//optional($.NLS),
				$.type_constraints,
			)),
			optional(choice(
				seq(
					//$.NLS,
					$.class_body,
				),
				seq(
					//$.NLS,
					$.enum_class_body,
				)
			))
		),

		primary_constructor: $ => seq(
			optional(seq(
				optional($.modifiers),
				$.CONSTRUCTOR,
				optional($.NLS)
			)),
			$._class_parameters
		),

		class_body: $ => seq(
			$.LCURL,
			optional($.NLS),
			optional($._class_member_declarations),
			$.RCURL
		),

		_class_parameters: $ => seq(
			$.LPAREN,
			optional($.NLS),
			optional(sep1(
				seq($.class_parameter, optional($.NLS)),
				seq(",", optional($.NLS))
			)),
			$.RPAREN,
		),

		class_parameter: $ => seq(
			optional(seq(
				optional($.modifiers),
				choice(
					"val",
					"var"
				),
				optional($.NLS),
			)),
			$.simpleIdentifier,
			":",
			optional($.NLS),
			$.type,
			optional(seq(
				// TODO
				//optional($.NLS),
				"=",
				optional($.NLS),
				$._expression
			))
		),

		_delegation_specifiers: $ => prec.left(sep1(
			$._annotated_delegation_specifier,
			seq(
				// TODO
				//optional($.NLS),
				",",
				//optional($.NLS),
			)
		)),

		delegation_specifier: $ => prec.left(choice(
			$.constructor_invocation,
			$.explicit_delegation,
			$.user_type,
			$.function_type
		)),

		constructor_invocation: $ => seq(
			$.userType,
			$.valueArguments
		),

		_annotated_delegation_specifier: $ => seq(
			optional(seq(
				$._annotations,
				optional($.NLS),
			)),
			$.delegation_specifier,
		),

		explicit_delegation: $ => seq(
			choice(
				$.user_type,
				$.function_type
			),
			optional($.NLS),
			"by",
			optional($.NLS),
			$.expression
		),

		type_parameters: $ => seq(
			$.LANGLE,
			optional($.NLS),
			sep1(
				seq($.type_parameter, optional($.NLS)),
				seq(",", optional($.NLS))
			),
			$.RANGLE
		),

		type_parameter: $ => seq(
			optional(seq(
				$.type_parameter_modifiers,
				optional($.NLS),
			)),
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				//TODO:
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$.type
			))
		),

		type_constraints: $ => seq(
			"where",
			optional($.NLS),
			sep1(
				$.type_constraint,
				seq(
					// TODO:
					//optional($.NLS),
					$.COMMA,
					optional($.NLS))
			)
		),

		type_constraint: $ => seq(
			optional($._annotations),
			alias($.simpleIdentifier, $.type_identifier),
			optional($.NLS),
			$.COLON,
			optional($.NLS),
			$.type
		),

		// ==========
		// Class members
		// ==========

		_class_member_declarations: $ => repeat1(seq(
			$._class_member_declaration,
			// TODO should be optional
			$._semis
			//optional($._semis)
		)),

		_class_member_declaration: $ => choice(
			$._declaration,
			$.companion_object,
			$.anonymous_initializer,
			$.secondary_constructor
		),

		anonymous_initializer: $ => seq(
			$.INIT,
			optional($.NLS),
			$.block
		),

		companion_object: $ => seq(
			optional($.modifiers),
			$.COMPANION,
			optional($.NLS),
			"object",
			optional(seq(
				// TODO
				//optional($.NLS),
				alias($.simpleIdentifier, $.type_identifier)
			)),
			optional(seq(
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._delegation_specifiers
			)),
			optional(seq(
				//optional($.NLS),
				$.class_body
			))
		),

		_function_value_parameters: $ => seq(
			"(",
			optional($.NLS),
			optional(sep1(
				seq($._function_value_parameter, optional($.NLS)),
				seq($.COMMA, optional($.NLS)))),
			")"
		),

		_function_value_parameter: $ => seq(
			optional($.parameter_modifiers),
			$.parameter,
			optional(seq(
				// TODO
				//optional($.NLS),
				"=",
				optional($.NLS),
				$._expression
			))
		),

		function_declaration: $ => seq(
			optional($.modifiers),
			"fun",
			optional(seq(
				optional($.NLS),
				$.type_parameters
			)),
			optional(seq(
				optional($.NLS),
				$.receiverTypeWithDot,
			)),
			$.simpleIdentifier,
			optional($.NLS),
			$._function_value_parameters,
			optional(seq(
				// TODO
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._type,
			)),
			optional(seq(
				//optional($.NLS),
				$.type_constraints,
			)),
			optional(seq(
				//optional($.NLS),
				$.function_body,
			)),
		),

		function_body: $ => choice(
			$.block,
			seq(
				"=",
				optional($.NLS),
				$._expression
			)
		),

		variable_declaration: $ => seq(
			optional($._annotations),
			// TODO
			//optional($.NLS),
			$.simpleIdentifier,
			optional(seq(
				//optional($.NLS),
				":",
				optional($.NLS),
				$._type
			))
		),

		multi_variable_declaration: $ => seq(
		    $.LPAREN,
		    optional($.NLS),
		    sep1(
		    	seq($.variable_declaration, optional($.NLS)),
				seq($.COMMA, optional($.NLS)),
			),
			$.RPAREN
		),

		property_declaration: $ => seq(
			optional($.modifiers),
			choice("val", "var"),
			optional(seq(
				optional($.NLS),
				$.type_parameters
			)),
			optional(seq(
				optional($.NLS),
				$.receiverTypeWithDot,
			)),
			choice(
				$.variable_declaration,
				$.multi_variable_declaration
			),
			optional(seq(
				optional($.NLS),
				$.type_constraints
			)),
			optional(choice(
				seq(
					optional($.NLS),
					"=",
					optional($.NLS),
					$._expression
				),
				seq(
					optional($.NLS),
					$.property_delegate
				)
			)),
			choice(
				seq(
					optional(seq(
						// TODO
						//$.NLS,
						$.semi,
					)),
					optional($.getter),
					optional(seq(
						// TODO
						//optional($.NLS),
						optional($.semi),
						$.setter,
					)),
				),
				seq(
					optional(seq(
						//$.NLS,
						$.semi,
					)),
					optional($.setter),
					optional(seq(
						//optional($.NLS),
						optional($.semi),
						$.getter,
					)),
				),
			)
		),

		property_delegate: $ => seq(
			"by",
			optional($.NLS),
			$._expression
		),

		getter: $ => seq(
			optional($.modifiers),
			"get",
			optional(seq(
				// TODO
				//optional($.NLS),
				"(",
				optional($.NLS),
				")",
				optional(seq(
					optional($.NLS),
					":",
					optional($.NLS),
					$.type
				)),
				optional($.NLS),
				$.function_body
			))
		),

		setter: $ => seq(
			optional($.modifiers),
			"set",
			optional(seq(
				// TODO
				//optional($.NLS),
				"(",
				optional($.NLS),
				$.parameterWithOptionalType,
				optional($.NLS),
				")",
				optional(seq(
					optional($.NLS),
					":",
					optional($.NLS),
					$._type
				)),
				optional($.NLS),
				$.function_body
			))
		),

		parametersWithOptionalType: $ => seq(
			$.LPAREN,
			optional(seq(
				optional($.NLS),
				$.parameterWithOptionalType,
				repeat(seq(
					optional($.NLS),
					$.COMMA,
					optional($.NLS),
					$.parameterWithOptionalType,
				)),
			)),
			optional($.NLS),
			$.RPAREN,
		),

		parameterWithOptionalType: $ => seq(
			optional($.parameter_modifiers),
			$.simpleIdentifier,
			optional(seq(
				// TODO
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._type
			))
		),

		parameter: $ => seq(
			$.simpleIdentifier,
			optional($.NLS),
			$.COLON,
			optional($.NLS),
			$.type
		),

		object_declaration: $ => seq(
			optional($.modifiers),
			"object",
			optional($.NLS),
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				// TODO
				//optional($.NLS),
				":",
				optional($.NLS),
				$._delegation_specifiers
			)),
			optional(seq(
				//optional($.NLS),
				$.class_body
			))
		),

		secondary_constructor: $ => seq(
			optional($.modifiers),
			$.CONSTRUCTOR,
			optional($.NLS),
			$._function_value_parameters,
			optional(seq(
				// TODO
				//optional($.NLS),
				":",
				optional($.NLS),
				$.constructor_delegation_call)),
			optional(seq(
				//optional($.NLS),
				$.block
			))
		),

		constructor_delegation_call: $ => seq(
			choice("this", "super"),
			optional($.NLS),
			$.value_arguments
		),

		// ==========
		// Enum classes
		// ==========

		enum_class_body: $ => seq(
			$.LCURL,
			optional($.NLS),
			$._enum_entries,
			optional(seq(
				";",
				optional($.NLS),
				optional($._class_member_declarations),
			)),
			$.RCURL
		),

		_enum_entries: $ => seq(
			sep1(
				seq($.enum_entry),
				seq(
					optional($.NLS),
					$.COMMA,
					optional($.NLS)
				)
			),
			optional(seq(
				optional($.NLS),
				$.COMMA
			)),
			optional($.NLS),
		),

		enum_entry: $ => seq(
			optional(seq(
				$.modifiers,
				optional($.NLS),
			)),
			$.simpleIdentifier,
			optional(seq(
				// TODO
				//optional($.NLS),
				$.value_arguments
			)),
			optional(seq(
				//optional($.NLS),
				$.class_body
			))
		),

		// ==========
		// Statements
		// ==========

		statements: $ => seq(
			$._statement,
			repeat(seq($._semis, $._statement)),
			optional($._semis),
		),

		_statement: $ => choice(
			seq(
				repeat(prec(PREC.STATEMENT_LABEL, choice($.label, $.annotation))),
				choice(
					$._declaration,
					$.assignment,
					$._loop_statement,
					$._expression
				)
			)
		),

		control_structure_body: $ => choice($.block, $._statement),

		block: $ => prec(PREC.BLOCK, seq(
			"{",
			optional(choice(
				seq(optional($.NLS), $.statements),
				$.semis
			)),
			"}",
		)),

		_loop_statement: $ => choice(
			$.for_statement,
			$.while_statement,
			$.do_while_statement
		),

		for_statement: $ => prec.right(seq(
			"for",
			"(",
			//repeat($.annotation),
			choice($.variable_declaration), // TODO: Multi-variable declaration
			"in",
			$._expression,
			")",
			optional($.control_structure_body)
		)),

		while_statement: $ => seq(
			"while",
			"(",
			$._expression,
			")",
			choice(";", $.control_structure_body)
		),

		do_while_statement: $ => prec.right(seq(
			"do",
			optional($.control_structure_body),
			"while",
			"(",
			$._expression,
			")",
		)),

		assignment: $ => choice(
			seq(
				$.directlyAssignableExpression,
				$.ASSIGNMENT,
				optional($.NLS),
				$.expression,
			),
			seq(
				$.assignableExpression,
				$._assignment_and_operator,
				optional($.NLS),
				$.expression
			),
		),

		annotated_lambda: $ => seq(
			repeat($.annotation),
			optional($.label),
			$.lambda_literal
		),

		lambda_literal: $ => prec(PREC.LAMBDA_LITERAL, seq(
			"{",
			optional(seq(
				optional($.NLS),
				optional($.lambda_parameters),
				"->",
			)),
			optional(seq(
				optional($.NLS),
				$.statements,
			)),
			"}",
		)),

		lambda_parameters: $ => sep1($._lambda_parameter, ","),

		_lambda_parameter: $ => choice(
			$.variable_declaration, // TODO
		),

		anonymous_function: $ => seq(
			"fun",
			optional(seq(
				optional($.NLS),
				$.receiverTypeWithDot,
			)),
			$.parametersWithOptionalType,
			optional(seq(
				//optional($.NLS),
				$.COLON,
				optional($.NLS),
				$._type,
			)),
			// Do really type constraints and empty body make sense?
			// optional(seq(
			// 	optional($.NLS),
			// 	$.type_constraints,
			// )),
			// optional(seq(
			// 	//optional($.NLS),
			// 	$.function_body,
			// )),
			$.function_body
		),

		_function_literal: $ => choice(
			$.lambda_literal,
			$.anonymous_function
		),

		object_literal: $ => seq(
			"object",
			optional(seq(":", $._delegation_specifiers)),
			$.class_body
		),

		if_expression: $ => prec.right(seq(
			"if",
			"(", $._expression, ")",
			choice(
				$.control_structure_body,
				";",
				seq(
					optional($.control_structure_body),
					optional(";"),
					"else",
					choice($.control_structure_body, ";")
				)
			)
		)),

		when_subject: $ => seq(
			"(",
			optional(seq(
				repeat($.annotation),
				"val",
				$.variable_declaration,
				"="
			)),
			$._expression,
			")",
		),

		when_expression: $ => seq(
			"when",
			optional($.when_subject),
			"{",
			repeat($.when_entry),
			"}"
		),

		when_entry: $ => seq(
			choice(
				seq($.when_condition, repeat(seq(",", $.when_condition))),
				"else"
			),
			"->",
			$.control_structure_body,
			optional($._semi)
		),

		when_condition: $ => seq(
			$._expression,
			$.range_test,
			$.type_test
		),

		range_test: $ => seq($._in_operator, $._expression),

		type_test: $ => seq($._is_operator, $._expression),

		try_expression: $ => seq(
			"try",
			$.block,
			choice(
				seq(repeat1($.catch_block), optional($.finally_block)),
				$.finally_block
			)
		),

		catch_block: $ => seq(
			"catch",
			"(",
			repeat($.annotation),
			$.simple_identifier,
			":",
			$._type,
			")",
			$.block,
		),

		finally_block: $ => seq("finally", $.block),

		_assignment_and_operator: $ => choice("+=", "-=", "*=", "/=", "%="),
		
		_in_operator: $ => $.inOperator,
		
		_is_operator: $ => $.isOperator,

		// ==========
		// Modifiers
		// ==========

		modifiers: $ => prec.right(repeat1(choice($.annotation, $._modifier))),

		parameter_modifiers: $ => prec.right(choice($.annotation, repeat1($.parameter_modifier))),

		_modifier: $ => choice(
			$.class_modifier,
			$.member_modifier,
			$.visibility_modifier,
			$.function_modifier,
			$.property_modifier,
			$.inheritance_modifier,
			$.parameter_modifier,
			$.platform_modifier
		),

		type_modifiers: $ => prec.right(repeat1($._type_modifier)),

		_type_modifier: $ => choice($.annotation, $.SUSPEND),

		class_modifier: $ => choice(
			$.ENUM,
			$.SEALED,
			$.ANNOTATION,
			$.DATA,
			$.INNER
		),

		member_modifier: $ => choice(
			$.OVERRIDE,
			$.LATEINIT
		),

		visibility_modifier: $ => choice(
			$.PUBLIC,
			$.PRIVATE,
			$.INTERNAL,
			$.PROTECTED
		),

		type_parameter_modifiers: $ => prec.right(repeat1($._type_parameter_modifier)),

		_type_parameter_modifier: $ => choice(
			$.reification_modifier,
			$.varianceModifier,
			$.annotation
		),

		function_modifier: $ => choice(
			$.TAILREC,
			$.OPERATOR,
			$.INFIX,
			$.INLINE,
			$.SUSPEND,
			$.SUSPEND
		),

		property_modifier: $ => $.CONST,

		inheritance_modifier: $ => choice(
			$.ABSTRACT,
			$.FINAL,
			$.OPEN
		),

		parameter_modifier: $ => choice(
			$.VARARG,
			$.NOINLINE,
			$.CROSSINLINE
		),

		reification_modifier: $ => $.REIFIED,

		platform_modifier: $ => choice(
			$.EXPECT,
			$.ACTUAL
		),

		// ==========
		// Identifiers
		// ==========

		identifier: $ => sep1($.simple_identifier, "."),

		// ==========
		// Glue for expression part converted from antlr
		// ==========

		_expression: $ => $.expression,
		value_arguments: $ => $.valueArguments,
		simple_identifier: $ => $.simpleIdentifier,
		_type: $ => $.type,
		user_type: $ => $.userType,
		function_type: $ => $.functionType,
		_simple_user_type: $ => $.simpleUserType,
		_semi: $ => $.semi,
		_semis: $ => $.semis,
		semi: $ => prec.right(choice(seq(";", optional($.NLS)), $.NLS)),
		semis: $ => choice(
			seq(
				repeat($.NLS),
				repeat1(seq(";", repeat($.NLS))),
			),
			repeat1($.NLS)
		),
		//_semis: $ => seq(optional($.NLS), repeat(seq(";", optional($.NLS)))),
		//parameter: $ => "parameter",





		//=================converted from antlr (expressions with some restrictions)==========================



		type: $ => seq(
			optional($.typeModifiers),
			choice(
				$.parenthesizedType,
				$.nullableType,
				$.typeReference,
				$.functionType
			)
		),

		typeReference: $ => choice(
			$.userType,
			$.DYNAMIC
		),

		nullableType: $ => prec.right(seq(
			choice(
				$.typeReference,
				$.parenthesizedType
			),
			//optional($.NLS),
			repeat1($.quest)
		)),

		quest: $ => $.NLSQUEST,

		userType: $ => seq(
			optional(seq(
				$.userType,
				alias($.NLSDOT, $.DOT),
				optional($.NLS)
			)),
			$.simpleUserType,
		),

		simpleUserType: $ => prec.right(seq(
			alias($.simpleIdentifier, $.type_identifier),
			optional(seq(
				//optional($.NLS),
				$.typeArguments
			))
		)),

		typeProjection: $ => choice(
			seq(
				optional($.typeProjectionModifiers),
				$.type
			),
			$.MULT
		),

		typeProjectionModifiers: $ => prec.right(repeat1($.typeProjectionModifier)),

		typeProjectionModifier: $ => prec(1, choice(
			seq(
				$.varianceModifier,
				optional($.NLS),
			),
			$.annotation
		)),

		functionType: $ => seq(
			optional(seq(
				$.receiverTypeWithDot,
			)),
			$.functionTypeParameters,
			optional($.NLS),
			$.ARROW,
			optional($.NLS),
			$.type
		),

		functionTypeParameters: $ => seq(
			$.LPAREN,
			optional(seq(optional($.NLS), choice(
				$.parameter,
				$.type
			))),
			repeat(seq(
				optional($.NLS),
				$.COMMA,
				optional($.NLS),
				choice(
					$.parameter,
					$.type
				)
			)),
			optional($.NLS),
			$.RPAREN
		),

		parenthesizedType: $ => prec(1, seq(
			$.LPAREN,
			optional($.NLS),
			$.type,
			optional($.NLS),
			$.RPAREN
		)),

		receiverType: $ => seq(
			choice(
				$.parenthesizedType,
				$.nullableType,
				$.typeReference
			)
		),

		receiverTypeWithDot: $ => choice(
			seq(
				$.receiverType,
				alias($.NLSDOT, $.DOT),
				optional($.NLS),
			)
		),

		label: $ => prec.right(seq(
			$.simpleIdentifier,
			choice(
				$.AT_NO_WS,
				$.AT_POST_WS
			),
			optional($.NLS)
		)),

		expression: $ => choice(
			$.disjunction,
			$.disjunctionWithReturn,
		),

		disjunctionWithReturn: $ => choice(
			$.conjunctionWithReturn,
			seq(
				$.disjunction,
				//optional($.NLS),
				$.DISJ,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		disjunction: $ => choice(
			$.conjunction,
			seq(
				$.disjunction,
				//optional($.NLS),
				$.DISJ,
				optional($.NLS),
				$.conjunction,
			)
		),

		conjunctionWithReturn: $ => choice(
			$.equalityWithReturn,
			seq(
				$.conjunction,
				//optional($.NLS),
				$.CONJ,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		conjunction: $ => choice(
			$.equality,
			seq(
				$.conjunction,
				//optional($.NLS),
				$.CONJ,
				optional($.NLS),
				$.equality,
			)
		),

		equalityWithReturn: $ => choice(
			$.comparisonWithReturn,
			seq(
				$.equality,
				$.equalityOperator,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		equality: $ => choice(
			$.comparison,
			seq(
				$.equality,
				$.equalityOperator,
				optional($.NLS),
				$.comparison
			)
		),

		comparisonWithReturn: $ => choice(
			$.infixOperationWithReturn,
			seq(
				$.infixOperation,
				$.comparisonOperator,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		comparison: $ => choice(
			$.infixOperation,
			seq(
				$.infixOperation,
				$.comparisonOperator,
				optional($.NLS),
				$.infixOperation
			)
		),

		infixOperationWithReturn: $ => choice(
			$.elvisExpressionWithReturn,
			seq(
				$.infixOperation,
				$.inOperator,
				optional($.NLS),
				$.rightRecursiveExpression,
			),
		),

		infixOperation: $ => choice(
			$.elvisExpression,
			seq(
				$.infixOperation,
				$.inOperator,
				optional($.NLS),
				$.elvisExpression
			),
			seq(
				$.infixOperation,
				$.isOperator,
				optional($.NLS),
				$.type
			),
		),

		elvisExpressionWithReturn: $ => choice(
			$.infixFunctionCallWithReturn,
			seq(
				$.elvisExpression,
				//optional($.NLS),
				$.elvis,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		elvisExpression: $ => prec(PREC.ELVIS, choice(
			$.infixFunctionCall,
			seq(
				$.elvisExpression,
				//optional($.NLS),
				$.elvis,
				optional($.NLS),
				$.infixFunctionCall,
			)
		)),

		elvis: $ => "?:",
		nullableCallable: $ => "?::",

		infixFunctionCallWithReturn: $ => prec(PREC.INFIX_CALL, choice(
			$.rangeExpressionWithReturn,
			seq(
				$.infixFunctionCall,
				$.simpleIdentifier,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		)),

		infixFunctionCall: $ => prec(PREC.INFIX_CALL, choice(
			$.rangeExpression,
			seq(
				$.infixFunctionCall,
				$.simpleIdentifier,
				optional($.NLS),
				$.rangeExpression
			)
		)),

		rangeExpressionWithReturn: $ => choice(
			$.additiveExpressionWithReturn,
			seq(
				$.rangeExpression,
				$.RANGE,
				optional($.NLS),
				$.rightRecursiveExpression,
			),
		),

		rangeExpression: $ => choice(
			$.additiveExpression,
			seq(
				$.rangeExpression,
				$.RANGE,
				optional($.NLS),
				$.additiveExpression
			),
		),

		additiveExpressionWithReturn: $ => choice(
			$.multiplicativeExpressionWithReturn,
			seq(
				$.additiveExpression,
				$.additiveOperator,
				optional($.NLS),
				$.rightRecursiveExpression,
			),
		),

		additiveExpression: $ => choice(
			$.multiplicativeExpression,
			seq(
				$.additiveExpression,
				$.additiveOperator,
				optional($.NLS),
				$.multiplicativeExpression
			),
		),

		multiplicativeExpressionWithReturn: $ => choice(
			$.asExpressionWithReturn,
			seq(
				$.multiplicativeExpression,
				$.multiplicativeOperator,
				optional($.NLS),
				$.rightRecursiveExpression,
			)
		),

		multiplicativeExpression: $ => choice(
			$.asExpression,
			seq(
				$.multiplicativeExpression,
				$.multiplicativeOperator,
				optional($.NLS),
				$.asExpression
			)
		),

		asExpressionWithReturn: $ => choice(
			$.prefixUnaryExpressionWithReturn,
		),

		asExpression: $ => seq(
			$.prefixUnaryExpression,
			optional(seq(
				//optional($.NLS),
				$.asOperator,
				optional($.NLS),
				$.type
			))
		),

		prefixUnaryExpressionWithReturn: $ => seq(
			repeat($.unaryPrefix),
			$.rightRecursiveExpression,
		),

		prefixUnaryExpression: $ => seq(
			repeat($.unaryPrefix),
			$.postfixUnaryExpression
		),

		unaryPrefix: $ => prec(PREC.UNARY_PREFIX, choice(
			$.annotation,
			$.label,
			seq(
				$.prefixUnaryOperator,
				optional($.NLS)
			)
		)),

		postfixUnaryExpression: $ => seq(
			$.primaryExpression,
			repeat(seq(
				$.postfixUnarySuffix,
			))
		),

		postfixUnarySuffix: $ => choice(
			$.postfixUnaryOperator,
			//$.typeArguments,
			$.callSuffix,
			$.indexingSuffix,
			$.navigationSuffix,
		),

		directlyAssignableExpression: $ => choice(
			seq(
				$.postfixUnaryExpression,
				$.assignableSuffix,
			),
			$.simpleIdentifier,
			$.parenthesizedDirectlyAssignableExpression,
		),

		parenthesizedDirectlyAssignableExpression: $ => seq(
			$.LPAREN,
			optional($.NLS),
			$.directlyAssignableExpression,
			optional($.NLS),
			$.RPAREN,
		),

		assignableExpression: $ => choice(
			$.prefixUnaryExpression,
			$.parenthesizedAssignableExpression,
		),

		parenthesizedAssignableExpression: $ => seq(
			$.LPAREN,
			optional($.NLS),
			$.assignableExpression,
			optional($.NLS),
			$.RPAREN,
		),

		assignableSuffix: $ => choice(
			$.typeArguments,
			$.indexingSuffix,
			$.navigationSuffix,
		),

		indexingSuffix: $ => seq(
			$.LSQUARE,
			optional($.NLS),
			$.expression,
			repeat(seq(
				optional($.NLS),
				$.COMMA,
				optional($.NLS),
				$.expression
			)),
			optional($.NLS),
			$.RSQUARE
		),

		navigationSuffix: $ => seq(
			//optional($.NLS),
			$.memberAccessOperator,
			optional($.NLS),
			choice(
				$.simpleIdentifier,
				$.parenthesizedExpression,
				$.CLASS
			)
		),

		callSuffix: $ => prec.right(choice(
			seq(
				optional($.typeArguments),
				optional($.valueArguments),
				$.annotated_lambda,
			),
			seq(
				optional($.typeArguments),
				$.valueArguments
			)
		)),

		typeArguments: $ => seq(
			$.LANGLE,
			optional($.NLS),
			$.typeProjection,
			repeat(seq(
				optional($.NLS),
				$.COMMA,
				optional($.NLS),
				$.typeProjection
			)),
			optional($.NLS),
			$.RANGLE
		),

		valueArguments: $ => choice(
			seq(
				$.LPAREN,
				optional($.NLS),
				$.RPAREN
			),
			seq(
				$.LPAREN,
				optional($.NLS),
				$.valueArgument,
				repeat(seq(
					optional($.NLS),
					$.COMMA,
					optional($.NLS),
					$.valueArgument
				)),
				optional($.NLS),
				$.RPAREN
			)
		),

		valueArgument: $ => prec(PREC.VALUE_ARGUMENT, seq(
			optional(seq($.annotation, optional($.NLS))),
			optional(seq(
				$.simpleIdentifier,
				//optional($.NLS),
				$.ASSIGNMENT,
				optional($.NLS)
			)),
			optional(seq($.MULT, optional($.NLS))),
			$.expression
		)),

		primaryExpression: $ => choice(
			$.parenthesizedExpression,
			$.simpleIdentifier,
			$.literalConstant,
			$.stringLiteral,
			$.callableReference,
			//$._function_literal,
			//$.object_literal,
			$.collectionLiteral,
			$.thisExpression,
			$.superExpression,
			//$.when_expression,
			// $.try_expression,
			//$.jumpExpression was moved to the top, see rightRecursiveExpression rule
			//$.if_expression,
		),

		parenthesizedExpression: $ => seq(
			$.LPAREN,
			optional($.NLS),
			$.expression,
			optional($.NLS),
			$.RPAREN
		),

		collectionLiteral: $ => choice(
			seq(
				$.LSQUARE,
				optional($.NLS),
				$.expression,
				repeat(seq(
					optional($.NLS),
					$.COMMA,
					optional($.NLS),
					$.expression
				)),
				optional($.NLS),
				$.RSQUARE
			),
			seq(
				$.LSQUARE,
				optional($.NLS),
				$.RSQUARE
			)
		),

		literalConstant: $ => choice(
			$.BooleanLiteral,
			$.IntegerLiteral,
			$.HexLiteral,
			$.BinLiteral,
			$.CharacterLiteral,
			$.RealLiteral,
			$.NullLiteral,
			$.LongLiteral,
			$.UnsignedLiteral
		),

		stringLiteral: $ => choice(
			$.lineStringLiteral,
			$.multiLineStringLiteral,
			// for not to break all following lines when closing quote is missing
			$.unfinishedLineStringLiteral,
		),

		lineStringLiteral: $ => seq(
			"\"",
			repeat(choice(
				$.lineStringContent,
				$.lineStringExpression,
			)),
			"\"",
		),

		unfinishedLineStringLiteral: $ => seq(
			"\"",
			repeat(choice(
				$.lineStringContent,
				$.lineStringExpression,
			)),
			$.NLS,
		),

		multiLineStringLiteral: $ => seq(
			$.TRIPLE_QUOTE_OPEN,
			repeat(choice(
				$.multiLineStringContent,
				$.multiLineStringExpression,
			)),
			$.TRIPLE_QUOTE_CLOSE,
		),

		lineStringContent: $ => choice(
			$.LineStrText,
			$.LineStrEscapedChar,
			$.LineStrRef,
		),

		lineStringExpression: $ => seq(
			"${",
			$.expression,
			"}",
		),

		multiLineStringContent: $ => choice(
			$.MultiLineStrText,
			$.MultiLineStrQuote,
			$.MultiLineStrRef,
		),

		multiLineStringExpression: $ => seq(
			"${",
			optional($.NLS),
			$.expression,
			optional($.NLS),
			"}",
		),

		LineStrText: $ => /[^\\"$]+|\$/,
		MultiLineStrText: $ => /[^"$]+|\$/,
		LineStrEscapedChar: $ => choice(
			$.EscapedIdentifier,
			$.UniCharacterLiteral,
		),
		LineStrRef: $ => $.FieldIdentifier,
		MultiLineStrQuote: $ => /"?"/,
		MultiLineStrRef: $ => $.FieldIdentifier,
		EscapedIdentifier: $ => /\\[tbrn'"\\$]/,
		UniCharacterLiteral: $ => /\\u[0-9a-fA-F]{4}/,
		FieldIdentifier: $ => token(seq("$", choice(
			seq(
				choice(
					/[a-zA-Z]/,
					"_"
				),
				repeat(choice(
					/[a-zA-Z]/,
					"_",
					/[0-9]/
				))
			),
			seq(
				"`",
				repeat1(/[^\r\n`]/),
				"`"
			)
		))),
		TRIPLE_QUOTE_OPEN: $ => /"""/,
		TRIPLE_QUOTE_CLOSE: $ => /"*"""/,

		thisExpression: $ => choice(
			$.THIS,
			$.THIS_AT
		),

		superExpression: $ => prec.left(choice(
			seq(
				$.SUPER,
				optional(seq(
					$.LANGLE,
					optional($.NLS),
					$.type,
					optional($.NLS),
					$.RANGLE
				)),
				optional(seq(
					$.AT_NO_WS,
					$.simpleIdentifier
				))
			),
			$.SUPER_AT
		)),

		rightRecursiveExpression: $ => choice(
			$.jumpExpression,
			//$.if_expression,
		),

		jumpExpression: $ => prec.right(choice(
			seq(
				$.THROW,
				optional($.NLS),
				$.expression,
			),
			seq(
				choice(
					$.RETURN,
					$.RETURN_AT,
				),
				optional($.expression),
			),
			$.CONTINUE,
			$.CONTINUE_AT,
			$.BREAK,
			$.BREAK_AT,
		)),

		callableReference: $ => seq(
			choice(
				seq(
					optional($.receiverType),
					//optional($.NLS)
					$.COLONCOLON,
				),
				seq(
					$.parenthesizedType,
					$.nullableCallable,
				),
				seq(
					$.typeReference,
					$.nullableCallable,
				),
			),
			optional($.NLS),
			choice(
				$.simpleIdentifier,
				$.CLASS,
			)
		),

		equalityOperator: $ => choice(
			$.EXCL_EQ,
			$.EXCL_EQEQ,
			$.EQEQ,
			$.EQEQEQ
		),

		comparisonOperator: $ => choice(
			$.LANGLE,
			$.RANGLE,
			$.LE,
			$.GE
		),

		inOperator: $ => choice(
			$.IN,
			$.NOT_IN
		),

		isOperator: $ => choice(
			$.IS,
			$.NOT_IS
		),

		additiveOperator: $ => choice(
			$.ADD,
			$.SUB
		),

		multiplicativeOperator: $ => choice(
			$.MULT,
			$.DIV,
			$.MOD
		),

		asOperator: $ => choice(
			$.AS,
			$.AS_SAFE
		),

		prefixUnaryOperator: $ => choice(
			$.INCR,
			$.DECR,
			$.SUB,
			$.ADD,
			$.excl
		),

		postfixUnaryOperator: $ => choice(
			$.INCR,
			$.DECR,
			seq(
				$.EXCL_NO_WS,
				$.excl
			)
		),

		excl: $ => choice(
			$.EXCL_NO_WS,
			$.EXCL_WS
		),

		memberAccessOperator: $ => choice(
			$.DOT,
			$.safeNav,
			$.COLONCOLON
		),

		safeNav: $ => seq($.NLSQUEST, $.DOT),

		typeModifiers: $ => prec.right(repeat1($.typeModifier)),

		typeModifier: $ => choice(
			$.annotation,
			seq(
				$.SUSPEND,
				optional($.NLS)
			)
		),

		varianceModifier: $ => choice(
			$.IN,
			$.OUT
		),

		_annotations: $ => repeat1($.annotation),

		annotation: $ => prec.right(seq(
			choice(
				$.singleAnnotation,
				$.multiAnnotation
			),
			optional($.NLS)
		)),

		singleAnnotation: $ => choice(
			seq(
				$.annotationUseSiteTarget,
				optional($.NLS),
				$.unescaped_annotation
			),
			seq(
				choice(
					$.AT_NO_WS,
					$.AT_PRE_WS
				),
				$.unescaped_annotation
			)
		),

		multiAnnotation: $ => choice(
			seq(
				$.annotationUseSiteTarget,
				optional($.NLS),
				$.LSQUARE,
				repeat1($.unescaped_annotation),
				$.RSQUARE
			),
			seq(
				choice(
					$.AT_NO_WS,
					$.AT_PRE_WS
				),
				$.LSQUARE,
				repeat1($.unescaped_annotation),
				$.RSQUARE
			)
		),

		annotationUseSiteTarget: $ => seq(
			choice(
				$.AT_NO_WS,
				$.AT_PRE_WS
			),
			choice(
				$.FIELD,
				$.PROPERTY,
				$.GET,
				$.SET,
				$.RECEIVER,
				$.PARAM,
				$.SETPARAM,
				$.DELEGATE
			),
			optional($.NLS),
			$.COLON
		),

		// right associativity is here to make annotations
		// starting with '@Ann(...' always be resolved as constructor call
		unescaped_annotation: $ => prec.right(choice(
			$.constructor_invocation,
			$.userType
		)),

		simpleIdentifier: $ => prec(PREC.SIMPLE_IDENTIDIER, choice(
			$.Identifier,
			$.ABSTRACT,
			$.ANNOTATION,
			$.BY,
			$.CATCH,
			$.COMPANION,
			$.CONSTRUCTOR,
			$.CROSSINLINE,
			$.DATA,
			$.DYNAMIC,
			$.ENUM,
			$.EXTERNAL,
			$.FINAL,
			$.FINALLY,
			$.GET,
			$.IMPORT,
			$.INFIX,
			$.INIT,
			$.INLINE,
			$.INNER,
			$.INTERNAL,
			$.LATEINIT,
			$.NOINLINE,
			$.OPEN,
			$.OPERATOR,
			$.OUT,
			$.OVERRIDE,
			$.PRIVATE,
			$.PROTECTED,
			$.PUBLIC,
			$.REIFIED,
			$.SEALED,
			$.TAILREC,
			$.SET,
			$.VARARG,
			$.WHERE,
			$.FIELD,
			$.PROPERTY,
			$.RECEIVER,
			$.PARAM,
			$.SETPARAM,
			$.DELEGATE,
			$.FILE,
			$.EXPECT,
			$.ACTUAL,
			$.CONST,
			$.SUSPEND
		)),

		DelimitedComment: $ => token(seq(
			"/*",
			repeat(/.|\n/),
			"*/"
		)),

		LineComment: $ => token(seq(
			"//",
			repeat(/[^\r\n]/)
		)),

		WS: $ => token(prec.right(repeat1(/[\u0020\u0009\u000C]+/))),

		NLS: $ => token(prec.right(repeat1(/(\n|\r\n)/))),

		Hidden: $ => token(choice(
			seq(
				repeat("\r\n"),
				"/*",
				repeat(/.|\n/),
				"*/"
			),
			token(seq(
				repeat("\r\n"),
				"//",
				repeat(/[^\r\n]/)
			)),
			token(/[\u0020\u0009\u000C]/)
		)),

		DOT: $ => token("."),

		NLSDOT: $ => seq(prec.right(repeat(/(\n|\r\n)/)), "."),

		COMMA: $ => token(","),

		LPAREN: $ => token("("),

		RPAREN: $ => token(")"),

		LSQUARE: $ => token("["),

		RSQUARE: $ => token("]"),

		LCURL: $ => token("{"),

		RCURL: $ => token("}"),

		MULT: $ => token("*"),

		MOD: $ => token("%"),

		DIV: $ => token("/"),

		ADD: $ => token("+"),

		SUB: $ => token("-"),

		INCR: $ => token("++"),

		DECR: $ => token("--"),

		CONJ: $ => token("&&"),

		DISJ: $ => token("||"),

		EXCL_WS: $ => token(seq(
			"!",
			choice(
				seq(
					"/*",
					repeat(/.|\n/),
					"*/"
				),
				token(seq(
					"//",
					repeat(/[^\r\n]/)
				)),
				token(/[\u0020\u0009\u000C]/)
			)
		)),

		EXCL_NO_WS: $ => token("!"),

		COLON: $ => token(":"),

		ASSIGNMENT: $ => token("="),

		ARROW: $ => token("->"),

		RANGE: $ => token(".."),

		COLONCOLON: $ => token("::"),

		AT_NO_WS: $ => token("@"),

		AT_POST_WS: $ => token(seq(
			"@",
			choice(
				choice(
					seq(
						"/*",
						repeat(/.|\n/),
						"*/"
					),
					token(seq(
						"//",
						repeat(/[^\r\n]/)
					)),
					token(/[\u0020\u0009\u000C]/)
				),
				token(choice(
					"\n",
					seq(
						"\r",
						optional("\n")
					)
				))
			)
		)),

		AT_PRE_WS: $ => token(seq(
			choice(
				choice(
					seq(
						"/*",
						repeat(/.|\n/),
						"*/"
					),
					token(seq(
						"//",
						repeat(/[^\r\n]/)
					)),
					token(/[\u0020\u0009\u000C]/)
				),
				token(choice(
					"\n",
					seq(
						"\r",
						optional("\n")
					)
				))
			),
			"@"
		)),

		QUEST_WS: $ => token(seq(
			"?",
			choice(
				seq(
					"/*",
					repeat(/.|\n/),
					"*/"
				),
				token(seq(
					"//",
					repeat(/[^\r\n]/)
				)),
				token(/[\u0020\u0009\u000C]/)
			)
		)),

		NLSQUEST: $ => /(\n|\r\n)*\?/,

		QUEST: $ => token("?"),

		LANGLE: $ => token("<"),

		RANGLE: $ => token(">"),

		LE: $ => token("<="),

		GE: $ => token(">="),

		EXCL_EQ: $ => token("!="),

		EXCL_EQEQ: $ => token("!=="),

		AS_SAFE: $ => token("as?"),

		EQEQ: $ => token("=="),

		EQEQEQ: $ => token("==="),

		RETURN_AT: $ => token(seq(
			"return@",
			choice(
				seq(
					choice(
						/[a-zA-Z]/,
						"_"
					),
					repeat(choice(
						/[a-zA-Z]/,
						"_",
						/[0-9]/
					))
				),
				seq(
					"`",
					repeat1(/[^\r\n`]/),
					"`"
				)
			)
		)),

		CONTINUE_AT: $ => token(seq(
			"continue@",
			choice(
				seq(
					choice(
						/[a-zA-Z]/,
						"_"
					),
					repeat(choice(
						/[a-zA-Z]/,
						"_",
						/[0-9]/
					))
				),
				seq(
					"`",
					repeat1(/[^\r\n`]/),
					"`"
				)
			)
		)),

		BREAK_AT: $ => token(seq(
			"break@",
			choice(
				seq(
					choice(
						/[a-zA-Z]/,
						"_"
					),
					repeat(choice(
						/[a-zA-Z]/,
						"_",
						/[0-9]/
					))
				),
				seq(
					"`",
					repeat1(/[^\r\n`]/),
					"`"
				)
			)
		)),

		THIS_AT: $ => token(seq(
			"this@",
			choice(
				seq(
					choice(
						/[a-zA-Z]/,
						"_"
					),
					repeat(choice(
						/[a-zA-Z]/,
						"_",
						/[0-9]/
					))
				),
				seq(
					"`",
					repeat1(/[^\r\n`]/),
					"`"
				)
			)
		)),

		SUPER_AT: $ => token(seq(
			"super@",
			choice(
				seq(
					choice(
						/[a-zA-Z]/,
						"_"
					),
					repeat(choice(
						/[a-zA-Z]/,
						"_",
						/[0-9]/
					))
				),
				seq(
					"`",
					repeat1(/[^\r\n`]/),
					"`"
				)
			)
		)),

		FILE: $ => token("file"),

		FIELD: $ => token("field"),

		PROPERTY: $ => token("property"),

		GET: $ => token("get"),

		SET: $ => token("set"),

		RECEIVER: $ => token("receiver"),

		PARAM: $ => token("param"),

		SETPARAM: $ => token("setparam"),

		DELEGATE: $ => token("delegate"),

		IMPORT: $ => token("import"),

		CLASS: $ => token("class"),

		CONSTRUCTOR: $ => token("constructor"),

		BY: $ => token("by"),

		COMPANION: $ => token("companion"),

		INIT: $ => token("init"),

		THIS: $ => token("this"),

		SUPER: $ => token("super"),

		WHERE: $ => token("where"),

		CATCH: $ => token("catch"),

		FINALLY: $ => token("finally"),

		THROW: $ => token("throw"),

		RETURN: $ => token("return"),

		CONTINUE: $ => token("continue"),

		BREAK: $ => token("break"),

		AS: $ => token("as"),

		IS: $ => token("is"),

		IN: $ => token("in"),

		NOT_IS: $ => token(seq(
			"!is",
			choice(
				choice(
					seq(
						"/*",
						repeat(/.|\n/),
						"*/"
					),
					token(seq(
						"//",
						repeat(/[^\r\n]/)
					)),
					token(/[\u0020\u0009\u000C]/)
				),
				token(choice(
					"\n",
					seq(
						"\r",
						optional("\n")
					)
				))
			)
		)),

		NOT_IN: $ => token(seq(
			"!in",
			choice(
				choice(
					seq(
						"/*",
						repeat(/.|\n/),
						"*/"
					),
					token(seq(
						"//",
						repeat(/[^\r\n]/)
					)),
					token(/[\u0020\u0009\u000C]/)
				),
				token(choice(
					"\n",
					seq(
						"\r",
						optional("\n")
					)
				))
			)
		)),

		OUT: $ => token("out"),

		DYNAMIC: $ => token("dynamic"),

		PUBLIC: $ => token("public"),

		PRIVATE: $ => token("private"),

		PROTECTED: $ => token("protected"),

		INTERNAL: $ => token("internal"),

		ENUM: $ => token("enum"),

		SEALED: $ => token("sealed"),

		ANNOTATION: $ => token("annotation"),

		DATA: $ => token("data"),

		INNER: $ => token("inner"),

		TAILREC: $ => token("tailrec"),

		OPERATOR: $ => token("operator"),

		INLINE: $ => token("inline"),

		INFIX: $ => token("infix"),

		EXTERNAL: $ => token("external"),

		SUSPEND: $ => token("suspend"),

		OVERRIDE: $ => token("override"),

		ABSTRACT: $ => token("abstract"),

		FINAL: $ => token("final"),

		OPEN: $ => token("open"),

		CONST: $ => token("const"),

		LATEINIT: $ => token("lateinit"),

		VARARG: $ => token("vararg"),

		NOINLINE: $ => token("noinline"),

		CROSSINLINE: $ => token("crossinline"),

		REIFIED: $ => token("reified"),

		EXPECT: $ => token("expect"),

		ACTUAL: $ => token("actual"),

		DecDigit: $ => token(/[0123456789]/),

		DecDigitNoZero: $ => token(/[123456789]/),

		DecDigitOrSeparator: $ => token(choice(
			token(/[0123456789]/),
			"_"
		)),

		DecDigits: $ => token(choice(
			seq(
				token(/[0123456789]/),
				repeat(choice(
					token(/[0123456789]/),
					"_"
				)),
				token(/[0123456789]/)
			),
			token(/[0123456789]/)
		)),

		DoubleExponent: $ => token(seq(
			/[eE]/,
			optional(/[+-]/),
			choice(
				seq(
					token(/[0123456789]/),
					repeat(choice(
						token(/[0123456789]/),
						"_"
					)),
					token(/[0123456789]/)
				),
				token(/[0123456789]/)
			)
		)),

		RealLiteral: $ => token(choice(
			choice(
				seq(
					choice(
						seq(
							optional(choice(
								seq(
									token(/[0123456789]/),
									repeat(choice(
										token(/[0123456789]/),
										"_"
									)),
									token(/[0123456789]/)
								),
								token(/[0123456789]/)
							)),
							".",
							choice(
								seq(
									token(/[0123456789]/),
									repeat(choice(
										token(/[0123456789]/),
										"_"
									)),
									token(/[0123456789]/)
								),
								token(/[0123456789]/)
							),
							optional(seq(
								/[eE]/,
								optional(/[+-]/),
								choice(
									seq(
										token(/[0123456789]/),
										repeat(choice(
											token(/[0123456789]/),
											"_"
										)),
										token(/[0123456789]/)
									),
									token(/[0123456789]/)
								)
							))
						),
						seq(
							choice(
								seq(
									token(/[0123456789]/),
									repeat(choice(
										token(/[0123456789]/),
										"_"
									)),
									token(/[0123456789]/)
								),
								token(/[0123456789]/)
							),
							seq(
								/[eE]/,
								optional(/[+-]/),
								choice(
									seq(
										token(/[0123456789]/),
										repeat(choice(
											token(/[0123456789]/),
											"_"
										)),
										token(/[0123456789]/)
									),
									token(/[0123456789]/)
								)
							)
						)
					),
					/[fF]/
				),
				seq(
					choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					),
					/[fF]/
				)
			),
			choice(
				seq(
					optional(choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					)),
					".",
					choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					),
					optional(seq(
						/[eE]/,
						optional(/[+-]/),
						choice(
							seq(
								token(/[0123456789]/),
								repeat(choice(
									token(/[0123456789]/),
									"_"
								)),
								token(/[0123456789]/)
							),
							token(/[0123456789]/)
						)
					))
				),
				seq(
					choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					),
					seq(
						/[eE]/,
						optional(/[+-]/),
						choice(
							seq(
								token(/[0123456789]/),
								repeat(choice(
									token(/[0123456789]/),
									"_"
								)),
								token(/[0123456789]/)
							),
							token(/[0123456789]/)
						)
					)
				)
			)
		)),

		FloatLiteral: $ => token(choice(
			seq(
				choice(
					seq(
						optional(choice(
							seq(
								token(/[0123456789]/),
								repeat(choice(
									token(/[0123456789]/),
									"_"
								)),
								token(/[0123456789]/)
							),
							token(/[0123456789]/)
						)),
						".",
						choice(
							seq(
								token(/[0123456789]/),
								repeat(choice(
									token(/[0123456789]/),
									"_"
								)),
								token(/[0123456789]/)
							),
							token(/[0123456789]/)
						),
						optional(seq(
							/[eE]/,
							optional(/[+-]/),
							choice(
								seq(
									token(/[0123456789]/),
									repeat(choice(
										token(/[0123456789]/),
										"_"
									)),
									token(/[0123456789]/)
								),
								token(/[0123456789]/)
							)
						))
					),
					seq(
						choice(
							seq(
								token(/[0123456789]/),
								repeat(choice(
									token(/[0123456789]/),
									"_"
								)),
								token(/[0123456789]/)
							),
							token(/[0123456789]/)
						),
						seq(
							/[eE]/,
							optional(/[+-]/),
							choice(
								seq(
									token(/[0123456789]/),
									repeat(choice(
										token(/[0123456789]/),
										"_"
									)),
									token(/[0123456789]/)
								),
								token(/[0123456789]/)
							)
						)
					)
				),
				/[fF]/
			),
			seq(
				choice(
					seq(
						token(/[0123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				),
				/[fF]/
			)
		)),

		DoubleLiteral: $ => token(choice(
			seq(
				optional(choice(
					seq(
						token(/[0123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				)),
				".",
				choice(
					seq(
						token(/[0123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				),
				optional(seq(
					/[eE]/,
					optional(/[+-]/),
					choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					)
				))
			),
			seq(
				choice(
					seq(
						token(/[0123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				),
				seq(
					/[eE]/,
					optional(/[+-]/),
					choice(
						seq(
							token(/[0123456789]/),
							repeat(choice(
								token(/[0123456789]/),
								"_"
							)),
							token(/[0123456789]/)
						),
						token(/[0123456789]/)
					)
				)
			)
		)),

		IntegerLiteral: $ => token(choice(
			seq(
				token(/[123456789]/),
				repeat(choice(
					token(/[0123456789]/),
					"_"
				)),
				token(/[0123456789]/)
			),
			token(/[0123456789]/)
		)),

		HexDigit: $ => token(/[0-9a-fA-F]/),

		HexDigitOrSeparator: $ => token(choice(
			token(/[0-9a-fA-F]/),
			"_"
		)),

		HexLiteral: $ => token(choice(
			seq(
				"0",
				/[xX]/,
				token(/[0-9a-fA-F]/),
				repeat(choice(
					token(/[0-9a-fA-F]/),
					"_"
				)),
				token(/[0-9a-fA-F]/)
			),
			seq(
				"0",
				/[xX]/,
				token(/[0-9a-fA-F]/)
			)
		)),

		BinDigit: $ => token(/[01]/),

		BinDigitOrSeparator: $ => token(choice(
			token(/[01]/),
			"_"
		)),

		BinLiteral: $ => token(choice(
			seq(
				"0",
				/[bB]/,
				token(/[01]/),
				repeat(choice(
					token(/[01]/),
					"_"
				)),
				token(/[01]/)
			),
			seq(
				"0",
				/[bB]/,
				token(/[01]/)
			)
		)),

		UnsignedLiteral: $ => token(seq(
			choice(
				choice(
					seq(
						token(/[123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				),
				choice(
					seq(
						"0",
						/[xX]/,
						token(/[0-9a-fA-F]/),
						repeat(choice(
							token(/[0-9a-fA-F]/),
							"_"
						)),
						token(/[0-9a-fA-F]/)
					),
					seq(
						"0",
						/[xX]/,
						token(/[0-9a-fA-F]/)
					)
				),
				choice(
					seq(
						"0",
						/[bB]/,
						token(/[01]/),
						repeat(choice(
							token(/[01]/),
							"_"
						)),
						token(/[01]/)
					),
					seq(
						"0",
						/[bB]/,
						token(/[01]/)
					)
				)
			),
			/[uU]/,
			optional("L")
		)),

		LongLiteral: $ => token(seq(
			choice(
				choice(
					seq(
						token(/[123456789]/),
						repeat(choice(
							token(/[0123456789]/),
							"_"
						)),
						token(/[0123456789]/)
					),
					token(/[0123456789]/)
				),
				choice(
					seq(
						"0",
						/[xX]/,
						token(/[0-9a-fA-F]/),
						repeat(choice(
							token(/[0-9a-fA-F]/),
							"_"
						)),
						token(/[0-9a-fA-F]/)
					),
					seq(
						"0",
						/[xX]/,
						token(/[0-9a-fA-F]/)
					)
				),
				choice(
					seq(
						"0",
						/[bB]/,
						token(/[01]/),
						repeat(choice(
							token(/[01]/),
							"_"
						)),
						token(/[01]/)
					),
					seq(
						"0",
						/[bB]/,
						token(/[01]/)
					)
				)
			),
			"L"
		)),

		BooleanLiteral: $ => token(choice(
			"true",
			"false"
		)),

		NullLiteral: $ => token("null"),

		CharacterLiteral: $ => token(seq(
			"\'",
			choice(
				choice(
					seq(
						"\\",
						"u",
						token(/[0-9a-fA-F]/),
						token(/[0-9a-fA-F]/),
						token(/[0-9a-fA-F]/),
						token(/[0-9a-fA-F]/)
					),
					token(seq(
						"\\",
						choice(
							"t",
							"b",
							"r",
							"n",
							"\'",
							"\"",
							"\\",
							"$"
						)
					))
				),
				/[^\n\r'\\]/
			),
			"\'"
		)),

		Identifier: $ => token(choice(
			seq(
				choice(
					/[a-zA-Z]/,
					"_"
				),
				repeat(choice(
					/[a-zA-Z]/,
					"_",
					/[0-9]/
				))
			),
			seq(
				"`",
				repeat1(/[^\r\n`]/),
				"`"
			)
		)),

		EOF: $ => token(/[\r\n]/),

	}
});

function sep1(rule, separator) {
	return seq(rule, repeat(seq(separator, rule)));
}
